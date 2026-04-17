const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const {
  getDoctorAppointments,
  updateAppointmentStatus,
  deleteAppointment,
  getDoctorPatients
} = require("../controllers/doctorAppointmentController");

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR APPOINTMENT MANAGEMENT ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/appointments/manage
// Fetch all appointments for the logged-in doctor
router.get("/", authenticate, getDoctorAppointments);

// PUT /api/appointments/manage/:id/status
// Update an appointment's status (Accept / Reject / Complete)
router.put("/:id/status", authenticate, updateAppointmentStatus);

// DELETE /api/appointments/manage/:id
// Delete an appointment permanently
router.delete("/:id", authenticate, deleteAppointment);

router.get(
  "/doctor/:doctorId/patients",

  getDoctorPatients
);

module.exports = router;
