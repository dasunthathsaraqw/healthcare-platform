// src/services/sessionService.js
// Business logic layer — all DB queries and lifecycle rules live here.
// Controllers call these functions and handle only HTTP concerns.
// This separation allows independent unit testing without Express.

"use strict";

const { TelemedicineSession, SESSION_STATUS } = require("../models/TelemedicineSession");
const { generateUidFromUserId }               = require("./agora.service");

// ── Channel name generator ─────────────────────────────────────────────────────
// Deterministic format: "consult_<appointmentId>"
// • Predictable — any service can derive the channel from an appointmentId.
// • Unique — appointmentId is already unique per appointment.
// • Agora-safe — alphanumeric + underscore, max 64 chars enforced.
const generateChannelName = (appointmentId) => {
  const raw = `consult_${appointmentId}`;
  return raw.slice(0, 64); // Agora hard limit
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a new SCHEDULED session from a confirmed appointment.
 * Throws 409 if a session already exists for this appointment.
 *
 * @param {object} data
 * @param {string} data.appointmentId
 * @param {string} data.patientId
 * @param {string} data.doctorId
 * @param {string} [data.patientName]
 * @param {string} [data.doctorName]
 * @param {string} [data.specialty]
 * @param {string|Date} data.scheduledAt
 * @param {string} [data.createdBy]   — userId of the requester
 * @returns {Promise<TelemedicineSession>}
 */
const createSession = async ({
  appointmentId,
  patientId,
  doctorId,
  patientName  = "",
  doctorName   = "",
  specialty    = "",
  scheduledAt,
  createdBy    = "",
}) => {
  // Guard: one session per appointment (unique index will also catch this,
  // but checking first gives a friendlier error message)
  const existing = await TelemedicineSession.findOne({ appointmentId });
  if (existing) {
    const err = new Error(
      "A telemedicine session already exists for this appointment."
    );
    err.statusCode = 409;
    throw err;
  }

  const channelName = generateChannelName(appointmentId);

  const session = new TelemedicineSession({
    appointmentId,
    patientId,
    doctorId,
    patientName,
    doctorName,
    specialty,
    channelName,
    scheduledAt: new Date(scheduledAt),
    status:      SESSION_STATUS.SCHEDULED,
    createdBy,
  });

  await session.save();
  return session;
};

// ─────────────────────────────────────────────────────────────────────────────
// READ
// ─────────────────────────────────────────────────────────────────────────────

const getSessionById = async (sessionId) => {
  const session = await TelemedicineSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found.");
    err.statusCode = 404;
    throw err;
  }
  return session;
};

const getSessionByAppointmentId = async (appointmentId) => {
  const session = await TelemedicineSession.findOne({ appointmentId });
  if (!session) {
    const err = new Error("No session found for this appointment.");
    err.statusCode = 404;
    throw err;
  }
  return session;
};

/**
 * Overwrite stored participant ids with the canonical appointment record.
 * Used when an older session was created from mock doctor/patient ids.
 */
const syncSessionParticipantsFromAppointment = async (appointmentId, appt) => {
  const session = await TelemedicineSession.findOne({ appointmentId });
  if (!session) return null;

  session.patientId = appt.patientId;
  session.doctorId = appt.doctorId;
  if (appt.patientName != null) session.patientName = appt.patientName;
  if (appt.doctorName != null) session.doctorName = appt.doctorName;
  if (appt.specialty != null) session.specialty = appt.specialty;

  await session.save();
  return session;
};

/**
 * All sessions for a patient, newest-first. Optional status filter.
 */
const getSessionsByPatient = async (patientId, statusFilter) => {
  const filter = { patientId };
  if (statusFilter) filter.status = statusFilter.toUpperCase();
  return TelemedicineSession.find(filter).sort({ scheduledAt: -1 });
};

/**
 * All sessions for a doctor, newest-first. Optional status filter.
 */
const getSessionsByDoctor = async (doctorId, statusFilter) => {
  const filter = { doctorId };
  if (statusFilter) filter.status = statusFilter.toUpperCase();
  return TelemedicineSession.find(filter).sort({ scheduledAt: -1 });
};

// ─────────────────────────────────────────────────────────────────────────────
// LIFECYCLE TRANSITIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Mark session ACTIVE when first participant joins.
 * Records startedAt and sets the appropriate joined flag.
 *
 * @param {string} sessionId
 * @param {"patient"|"doctor"} joinerRole — derived from the caller's JWT role
 * @returns {Promise<TelemedicineSession>}
 */
const startSession = async (sessionId, joinerRole) => {
  const session = await TelemedicineSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found.");
    err.statusCode = 404;
    throw err;
  }

  const terminal = [SESSION_STATUS.ENDED, SESSION_STATUS.CANCELLED];
  if (terminal.includes(session.status)) {
    const err = new Error(
      `Cannot start a session that is already ${session.status}.`
    );
    err.statusCode = 400;
    throw err;
  }

  // First join → flip to ACTIVE and record startedAt
  if (session.status === SESSION_STATUS.SCHEDULED) {
    session.status    = SESSION_STATUS.ACTIVE;
    session.startedAt = new Date();
  }

  if (joinerRole === "patient") session.patientJoined = true;
  if (joinerRole === "doctor")  session.doctorJoined  = true;

  await session.save();
  return session;
};

/**
 * Mark session ENDED and compute durationMinutes.
 *
 * @param {string} sessionId
 * @param {string} [notes] — optional clinical notes from doctor
 */
const endSession = async (sessionId, notes) => {
  const session = await TelemedicineSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found.");
    err.statusCode = 404;
    throw err;
  }

  if (session.status === SESSION_STATUS.ENDED) {
    const err = new Error("Session has already ended.");
    err.statusCode = 400;
    throw err;
  }
  if (session.status === SESSION_STATUS.CANCELLED) {
    const err = new Error("Cannot end a cancelled session.");
    err.statusCode = 400;
    throw err;
  }

  const now = new Date();
  session.status  = SESSION_STATUS.ENDED;
  session.endedAt = now;

  if (session.startedAt) {
    const ms = now - session.startedAt;
    session.durationMinutes = Math.max(0, Math.round(ms / 60000));
  }

  if (notes !== undefined) session.notes = notes;

  await session.save();
  return session;
};

/**
 * Cancel session from SCHEDULED or ACTIVE state.
 */
const cancelSession = async (sessionId, reason) => {
  const session = await TelemedicineSession.findById(sessionId);
  if (!session) {
    const err = new Error("Session not found.");
    err.statusCode = 404;
    throw err;
  }

  if ([SESSION_STATUS.ENDED, SESSION_STATUS.CANCELLED].includes(session.status)) {
    const err = new Error(
      `Cannot cancel a session that is already ${session.status}.`
    );
    err.statusCode = 400;
    throw err;
  }

  session.status = SESSION_STATUS.CANCELLED;
  if (reason) session.cancellationReason = reason;

  await session.save();
  return session;
};

/**
 * Update clinical notes on any session (doctor / admin only — enforced in router).
 */
const updateNotes = async (sessionId, notes) => {
  const session = await TelemedicineSession.findByIdAndUpdate(
    sessionId,
    { $set: { notes } },
    { new: true }
  );
  if (!session) {
    const err = new Error("Session not found.");
    err.statusCode = 404;
    throw err;
  }
  return session;
};

module.exports = {
  createSession,
  getSessionById,
  getSessionByAppointmentId,
  syncSessionParticipantsFromAppointment,
  getSessionsByPatient,
  getSessionsByDoctor,
  startSession,
  endSession,
  cancelSession,
  updateNotes,
  SESSION_STATUS,
};
