// src/controllers/sessionController.js
// Thin HTTP adapter — all business logic lives in sessionService.js.
// Response contract: { success, message?, data? } — consistent across every endpoint.

"use strict";

const sessionService                              = require("../services/sessionService");
const { getAppointmentById, verifyParticipant }   = require("../services/appointment.service");
const { generateRtcToken, generateUidFromUserId } = require("../services/agora.service");
const { publishNotificationEvent }                = require("../utils/rabbitmq");
const { ApiError }                                = require("../utils/ApiError");

// ── Error responder ────────────────────────────────────────────────────────────
// Converts any thrown error (ApiError or vanilla Error) into a clean HTTP response.
const handleError = (res, err, fallback = "Internal server error") => {
  const status  = err.statusCode || 500;
  const message = err.message    || fallback;
  console.error(`[TelemedicineController] ${message}`, err.stack || "");
  return res.status(status).json({ success: false, message });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. createSession
// POST /api/telemedicine/sessions
// Body: { appointmentId }
//
// Flow:
//   a) Validate input field is present.
//   b) Call appointment.service → verify status is CONFIRMED.
//   c) Delegate to sessionService.createSession() which:
//        • Guards against duplicates (unique index + pre-check).
//        • Generates channelName = "consult_<appointmentId>".
//        • Persists the TelemedicineSession document.
//   d) Publish SESSION_CREATED event (fire-and-forget).
// ─────────────────────────────────────────────────────────────────────────────
const createSession = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    // ── Validate input ────────────────────────────────────────────────────────
    if (!appointmentId || typeof appointmentId !== "string" || !appointmentId.trim()) {
      throw ApiError.badRequest("appointmentId is required and must be a non-empty string.");
    }

    // ── Fetch + validate appointment ──────────────────────────────────────────
    // getAppointmentById throws 404 if not found and 422 if not CONFIRMED.
    const appointment = await getAppointmentById(appointmentId.trim());

    // ── Create session ────────────────────────────────────────────────────────
    const session = await sessionService.createSession({
      appointmentId:  appointment.appointmentId,
      patientId:      appointment.patientId,
      doctorId:       appointment.doctorId,
      patientName:    appointment.patientName,
      doctorName:     appointment.doctorName,
      specialty:      appointment.specialty,
      scheduledAt:    appointment.scheduledAt,
      createdBy:      req.user.id,
    });

    // ── Notify (non-blocking) ─────────────────────────────────────────────────
    publishNotificationEvent("SESSION_CREATED", {
      sessionId:    session._id.toString(),
      appointmentId,
      patientId:    session.patientId,
      doctorId:     session.doctorId,
      channelName:  session.channelName,
      scheduledAt:  session.scheduledAt.toISOString(),
    }).catch((e) => console.warn("Non-critical: SESSION_CREATED publish failed:", e.message));

    return res.status(201).json({
      success: true,
      message: "Telemedicine session created successfully.",
      data:    { session },
    });
  } catch (err) {
    return handleError(res, err, "Failed to create session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. getSessionByAppointmentId
// GET /api/telemedicine/sessions/appointment/:appointmentId
// ─────────────────────────────────────────────────────────────────────────────
const getSessionByAppointmentId = async (req, res) => {
  try {
    const { appointmentId } = req.params;

    if (!appointmentId) throw ApiError.badRequest("appointmentId param is required.");

    const session = await sessionService.getSessionByAppointmentId(appointmentId);
    return res.status(200).json({ success: true, data: { session } });
  } catch (err) {
    return handleError(res, err, "Failed to fetch session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. joinSession
// POST /api/telemedicine/sessions/:appointmentId/join
// Body: { uid? }  — optional numeric Agora uid override
//
// Flow:
//   a) Find the session by appointmentId.
//   b) Validate the caller (req.user.id) is the patient or doctor.
//   c) Generate an Agora RTC token scoped to this channel.
//   d) Return: { appId, channelName, token, uid, role, session }
// ─────────────────────────────────────────────────────────────────────────────
const joinSession = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const callerId = req.user.id;
    const callerRole = req.user.role; // "patient" | "doctor" from JWT

    if (!appointmentId) throw ApiError.badRequest("appointmentId param is required.");
    if (!callerId)      throw ApiError.unauthorized("User ID missing from token.");

    // ── Find session ──────────────────────────────────────────────────────────
    const session = await sessionService.getSessionByAppointmentId(appointmentId);

    // ── Validate participant ───────────────────────────────────────────────────
    const isParticipant =
      session.patientId === callerId || session.doctorId === callerId;

    if (!isParticipant && callerRole !== "admin") {
      throw ApiError.forbidden("You are not a participant in this session.");
    }

    // ── Guard: cannot join an ended/cancelled session ─────────────────────────
    if (["ENDED", "CANCELLED"].includes(session.status)) {
      throw ApiError.unprocessable(
        `Cannot join a session that is already ${session.status}.`
      );
    }

    // ── Generate Agora token ──────────────────────────────────────────────────
    const uid = req.body?.uid !== undefined
      ? Number(req.body.uid)
      : generateUidFromUserId(callerId);

    const tokenData = generateRtcToken({
      channelName: session.channelName,
      uid,
      role: "PUBLISHER",
    });

    // ── Determine display role ────────────────────────────────────────────────
    const sessionRole =
      session.doctorId === callerId ? "doctor" :
      session.patientId === callerId ? "patient" : callerRole;

    return res.status(200).json({
      success: true,
      message: "Join credentials generated successfully.",
      data: {
        appId:       tokenData.appId,
        channelName: tokenData.channelName,
        token:       tokenData.token,
        uid:         tokenData.uid,
        role:        sessionRole,        // "doctor" | "patient"
        expiresAt:   tokenData.expiresAt,
        session: {
          _id:         session._id,
          status:      session.status,
          patientName: session.patientName,
          doctorName:  session.doctorName,
          specialty:   session.specialty,
          scheduledAt: session.scheduledAt,
        },
      },
    });
  } catch (err) {
    return handleError(res, err, "Failed to join session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. startSession
// PATCH /api/telemedicine/sessions/:id/start
//
// Marks the session ACTIVE and records startedAt.
// Sets patientJoined or doctorJoined based on req.user.role.
// ─────────────────────────────────────────────────────────────────────────────
const startSession = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw ApiError.badRequest("Session id param is required.");

    const session = await sessionService.startSession(id, req.user.role);

    publishNotificationEvent("SESSION_STARTED", {
      sessionId:     session._id.toString(),
      appointmentId: session.appointmentId,
      patientId:     session.patientId,
      doctorId:      session.doctorId,
      startedAt:     session.startedAt?.toISOString(),
    }).catch((e) => console.warn("Non-critical: SESSION_STARTED publish failed:", e.message));

    return res.status(200).json({
      success: true,
      message: "Session is now ACTIVE.",
      data:    { session },
    });
  } catch (err) {
    return handleError(res, err, "Failed to start session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. endSession
// PATCH /api/telemedicine/sessions/:id/end
// Body: { notes? }  — doctor/admin only (enforced in router)
//
// Marks the session ENDED, records endedAt, computes durationMinutes.
// ─────────────────────────────────────────────────────────────────────────────
const endSession = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) throw ApiError.badRequest("Session id param is required.");

    const session = await sessionService.endSession(id, req.body?.notes);

    publishNotificationEvent("SESSION_ENDED", {
      sessionId:       session._id.toString(),
      appointmentId:   session.appointmentId,
      patientId:       session.patientId,
      doctorId:        session.doctorId,
      durationMinutes: session.durationMinutes,
      endedAt:         session.endedAt?.toISOString(),
    }).catch((e) => console.warn("Non-critical: SESSION_ENDED publish failed:", e.message));

    return res.status(200).json({
      success: true,
      message: "Session ended successfully.",
      data:    { session },
    });
  } catch (err) {
    return handleError(res, err, "Failed to end session");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Supplemental controllers
// ─────────────────────────────────────────────────────────────────────────────

const getSessionById = async (req, res) => {
  try {
    const session = await sessionService.getSessionById(req.params.id);
    return res.status(200).json({ success: true, data: { session } });
  } catch (err) {
    return handleError(res, err, "Failed to fetch session");
  }
};

const getSessionsByPatient = async (req, res) => {
  try {
    const sessions = await sessionService.getSessionsByPatient(
      req.params.patientId, req.query.status
    );
    return res.status(200).json({ success: true, data: { count: sessions.length, sessions } });
  } catch (err) {
    return handleError(res, err, "Failed to fetch patient sessions");
  }
};

const getSessionsByDoctor = async (req, res) => {
  try {
    const sessions = await sessionService.getSessionsByDoctor(
      req.params.doctorId, req.query.status
    );
    return res.status(200).json({ success: true, data: { count: sessions.length, sessions } });
  } catch (err) {
    return handleError(res, err, "Failed to fetch doctor sessions");
  }
};

const cancelSession = async (req, res) => {
  try {
    const session = await sessionService.cancelSession(req.params.id, req.body?.reason);
    return res.status(200).json({ success: true, message: "Session cancelled.", data: { session } });
  } catch (err) {
    return handleError(res, err, "Failed to cancel session");
  }
};

const updateNotes = async (req, res) => {
  try {
    const { notes } = req.body;
    if (notes === undefined) throw ApiError.badRequest("notes field is required.");
    const session = await sessionService.updateNotes(req.params.id, notes);
    return res.status(200).json({ success: true, message: "Notes updated.", data: { session } });
  } catch (err) {
    return handleError(res, err, "Failed to update notes");
  }
};

module.exports = {
  createSession,
  getSessionById,
  getSessionByAppointmentId,
  getSessionsByPatient,
  getSessionsByDoctor,
  joinSession,
  startSession,
  endSession,
  cancelSession,
  updateNotes,
};
