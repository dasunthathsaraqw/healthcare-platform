// src/routes/sessionRouter.js
// All routes are mounted at /api/telemedicine/sessions in src/app.js.
//
// Auth middleware: uses authMiddleware.js which supports:
//   • BYPASS_AUTH=true  → injects mock user (dev mode)
//   • BYPASS_AUTH=false → real JWT verification (production)
//
// ORDERING RULE: Named sub-paths MUST come before wildcard /:id routes.
// Express matches top-to-bottom, so "appointment", "patient", "doctor"
// must be declared before /:id or they'd be treated as an id value.

"use strict";

const express = require("express");
const router  = express.Router();

// TODO: swap import path from "./auth" → "./authMiddleware" once fully tested
// Both files expose identical { authenticate, authorize } signatures.
const { authenticate, authorize } = require("../middleware/authMiddleware");

const {
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
} = require("../controllers/sessionController");

// ── 1. Named collection look-ups ─────────────────────────────────────────────
// These MUST be above the /:id wildcard.

// GET /api/telemedicine/sessions/appointment/:appointmentId
// → Look up the session linked to a specific appointment
router.get("/appointment/:appointmentId", authenticate, getSessionByAppointmentId);

// GET /api/telemedicine/sessions/patient/:patientId  ?status=SCHEDULED|ACTIVE|ENDED|CANCELLED
// → All sessions for a patient (newest first)
router.get("/patient/:patientId",  authenticate, getSessionsByPatient);

// GET /api/telemedicine/sessions/doctor/:doctorId  ?status=...
// → All sessions for a doctor (newest first)
router.get("/doctor/:doctorId",    authenticate, getSessionsByDoctor);

// ── 2. Collection-level action ────────────────────────────────────────────────

// POST /api/telemedicine/sessions
// Body: { appointmentId }
// → Create a new session from a CONFIRMED appointment
router.post("/", authenticate, createSession);

// ── 3. Item-level sub-actions (named — before wildcard /:id GET) ──────────────

// POST /api/telemedicine/sessions/:appointmentId/join
// Body: { uid? }
// → Validate participant, generate Agora token, return join credentials
// TODO: once auth is real, add: authorize("patient", "doctor", "admin")
router.post("/:appointmentId/join", authenticate, joinSession);

// PATCH /api/telemedicine/sessions/:id/start
// → Mark ACTIVE when first participant joins the Agora channel
// TODO: add authorize("patient", "doctor") once auth is stable
router.patch("/:id/start",  authenticate, startSession);

// PATCH /api/telemedicine/sessions/:id/end
// → Mark ENDED, compute duration — doctor/admin only
router.patch("/:id/end",    authenticate, authorize("doctor", "admin"), endSession);

// PATCH /api/telemedicine/sessions/:id/cancel
// → Cancel a SCHEDULED or ACTIVE session
router.patch("/:id/cancel", authenticate, cancelSession);

// PATCH /api/telemedicine/sessions/:id/notes
// → Update clinical notes — doctor/admin only
router.patch("/:id/notes",  authenticate, authorize("doctor", "admin"), updateNotes);

// ── 4. Single item GET (wildcard — must be last) ──────────────────────────────

// GET /api/telemedicine/sessions/:id
// → Fetch a single session by its Mongo _id
router.get("/:id", authenticate, getSessionById);

module.exports = router;
