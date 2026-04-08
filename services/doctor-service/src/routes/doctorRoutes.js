const express = require("express");
const router = express.Router();

const { doctorRegister, doctorLogin } = require("../controllers/authController");
const {
  getDoctorProfile,
  updateDoctorProfile,
  changePassword,
  addAvailability,
  getAvailability,
  updateAvailability,
  deleteAvailability,
  getAppointments,
  acceptAppointment,
  rejectAppointment,
  completeAppointment,
  issuePrescription,
  getPrescriptions,
  getPatients,
  getPatientDetails,
  getDashboardStats,
  searchDoctors,
  getPublicDoctorProfile,
  getPublicDoctorAvailability,
} = require("../controllers/doctorController");
const { authenticate } = require("../middleware/auth");

// ── Public routes (no auth) ──────────────────────────────────────────────────

router.post("/register", doctorRegister);
router.post("/login",    doctorLogin);

// Patient-facing: search all verified doctors
router.get("/", searchDoctors);

// IMPORTANT: specific named paths BEFORE /:id wildcard
router.get("/:id/availability", getPublicDoctorAvailability);
router.get("/:id",              getPublicDoctorProfile);

// ── Protected routes (JWT required) ─────────────────────────────────────────

// Profile
router.get("/profile",          authenticate, getDoctorProfile);
router.put("/profile",          authenticate, updateDoctorProfile);
router.put("/change-password",  authenticate, changePassword);

// Availability
router.get("/availability",        authenticate, getAvailability);
router.post("/availability",       authenticate, addAvailability);
router.put("/availability/:id",    authenticate, updateAvailability);
router.delete("/availability/:id", authenticate, deleteAvailability);

// Appointments
router.get("/appointments",              authenticate, getAppointments);
router.put("/appointments/:id/accept",   authenticate, acceptAppointment);
router.put("/appointments/:id/reject",   authenticate, rejectAppointment);
router.put("/appointments/:id/complete", authenticate, completeAppointment);

// Prescriptions
router.get("/prescriptions",  authenticate, getPrescriptions);
router.post("/prescriptions", authenticate, issuePrescription);

// Patients
router.get("/patients",            authenticate, getPatients);
router.get("/patients/:patientId", authenticate, getPatientDetails);

// Dashboard
router.get("/dashboard/stats", authenticate, getDashboardStats);

module.exports = router;
