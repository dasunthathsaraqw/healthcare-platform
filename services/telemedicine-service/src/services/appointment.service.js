// src/services/appointment.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Appointment Integration Layer
//
// CURRENT STATE: Returns mock data so development can proceed independently
// while the real appointment-service is being built.
//
// HOW TO REPLACE WITH REAL INTEGRATION (3 steps):
//   1. Set APPOINTMENT_SERVICE_URL in .env
//   2. Uncomment the axios block in getAppointmentById()
//   3. Delete or comment out the mock block below it
//
// The function signatures and return shapes are intentionally kept identical
// so every caller works without changes after the swap.
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const axios = require("axios");

// Base URL of the real appointment-service (used when mock is disabled)
const APPOINTMENT_SERVICE_URL =
  process.env.APPOINTMENT_SERVICE_URL || "http://appointment-service:3003";

// ── Mock data store ───────────────────────────────────────────────────────────
// A small in-memory map keyed by appointmentId.
// Expand or replace with a fixture file if you need more test cases.
const MOCK_APPOINTMENTS = {
  "mock-appt-001": {
    appointmentId: "mock-appt-001",
    doctorId:      "mock-doctor-001",
    patientId:     "mock-patient-001",
    doctorName:    "Dr. Sarah Johnson",
    patientName:   "John Doe",
    specialty:     "General Medicine",
    status:        "CONFIRMED",
    scheduledAt:   new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 min from now
    consultationFee: 1500,
  },
  "mock-appt-002": {
    appointmentId: "mock-appt-002",
    doctorId:      "mock-doctor-002",
    patientId:     "mock-patient-002",
    doctorName:    "Dr. Priya Sharma",
    patientName:   "Jane Smith",
    specialty:     "Cardiology",
    status:        "CONFIRMED",
    scheduledAt:   new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(), // 2 hrs from now
    consultationFee: 2500,
  },
};

// ── Helper: build a mock from any unknown appointmentId ───────────────────────
// Lets developers test with arbitrary IDs without editing the map above.
const buildDynamicMock = (appointmentId) => ({
  appointmentId,
  doctorId:      "mock-doctor-001",
  patientId:     "mock-patient-001",
  doctorName:    "Dr. Sarah Johnson",
  patientName:   "John Doe",
  specialty:     "General Medicine",
  status:        "CONFIRMED",
  scheduledAt:   new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  consultationFee: 1500,
  _isMock:       true, // flag so callers can detect mock data in logs/tests
});

// ─────────────────────────────────────────────────────────────────────────────
// getAppointmentById(appointmentId)
//
// Returns appointment details needed to create a telemedicine session:
//   { appointmentId, doctorId, patientId, doctorName, patientName,
//     specialty, status, scheduledAt, consultationFee }
//
// Throws an error (with statusCode) if appointment is not found or not
// in a CONFIRMED state.
// ─────────────────────────────────────────────────────────────────────────────
const getAppointmentById = async (appointmentId) => {
  // ── MOCK BLOCK ─────────────────────────────────────────────────────────────
  // TODO: Remove this block when appointment-service is ready.
  // ──────────────────────────────────────────────────────────────────────────
  const USE_MOCK = process.env.USE_MOCK_APPOINTMENTS !== "false";

  if (USE_MOCK) {
    console.log(
      `[AppointmentService] 🟡 MOCK: fetching appointment ${appointmentId}`
    );

    const appointment =
      MOCK_APPOINTMENTS[appointmentId] || buildDynamicMock(appointmentId);

    // Simulate not-confirmed guard (same logic the real service will apply)
    if (appointment.status !== "CONFIRMED") {
      const err = new Error(
        "Appointment is not in CONFIRMED state. Cannot create session."
      );
      err.statusCode = 422;
      throw err;
    }

    return appointment;
  }
  // ── END MOCK BLOCK ─────────────────────────────────────────────────────────

  // ── REAL INTEGRATION BLOCK ─────────────────────────────────────────────────
  // Uncomment when appointment-service is live and USE_MOCK_APPOINTMENTS=false
  // ──────────────────────────────────────────────────────────────────────────
  /*
  try {
    console.log(
      `[AppointmentService] 🔵 REAL: fetching appointment ${appointmentId}`
    );

    const response = await axios.get(
      `${APPOINTMENT_SERVICE_URL}/api/appointments/${appointmentId}`,
      {
        headers: {
          // Pass along the internal service secret so appointment-service
          // recognises this as a trusted service-to-service call.
          Authorization: `Bearer ${process.env.INTERNAL_SECRET || ""}`,
        },
        timeout: 5000, // fail fast — don't block the caller
      }
    );

    const { appointment } = response.data;

    if (!appointment) {
      const err = new Error("Appointment not found.");
      err.statusCode = 404;
      throw err;
    }

    // Normalise: appointment-service uses lowercase status ("confirmed")
    // but this service uses uppercase ("CONFIRMED").
    if (appointment.status?.toLowerCase() !== "confirmed") {
      const err = new Error(
        "Appointment is not in CONFIRMED state. Cannot create session."
      );
      err.statusCode = 422;
      throw err;
    }

    return {
      appointmentId: appointment._id || appointment.appointmentId,
      doctorId:      appointment.doctorId,
      patientId:     appointment.patientId,
      doctorName:    appointment.doctorName  || "",
      patientName:   appointment.patientName || "",
      specialty:     appointment.specialty   || "",
      status:        "CONFIRMED",
      scheduledAt:   appointment.dateTime    || appointment.scheduledAt,
      consultationFee: appointment.consultationFee || 0,
    };
  } catch (error) {
    if (error.statusCode) throw error; // already a typed business error

    // Network/timeout error from axios
    console.error("[AppointmentService] ❌ Failed to reach appointment-service:", error.message);
    const err = new Error("Failed to fetch appointment details. Please try again.");
    err.statusCode = 503;
    throw err;
  }
  */
  // ── END REAL INTEGRATION BLOCK ─────────────────────────────────────────────
};

// ─────────────────────────────────────────────────────────────────────────────
// verifyParticipant(appointmentId, userId)
//
// Checks that userId is either the patientId or doctorId on the appointment.
// Prevents one user from joining another user's session.
// ─────────────────────────────────────────────────────────────────────────────
const verifyParticipant = async (appointmentId, userId) => {
  const appointment = await getAppointmentById(appointmentId);

  const isParticipant =
    appointment.patientId === userId || appointment.doctorId === userId;

  if (!isParticipant) {
    const err = new Error("You are not a participant in this appointment.");
    err.statusCode = 403;
    throw err;
  }

  return appointment;
};

module.exports = {
  getAppointmentById,
  verifyParticipant,
  APPOINTMENT_SERVICE_URL, // exported so agora.service.js can log it
};
