const express = require("express");
const router = express.Router();

const { authenticate } = require("../middleware/auth");
const {
  bookAppointment,
  getPatientUpcoming,
  getPatientPast,
  getAppointmentsByPatient,
  getAppointmentsByDoctor,
  getDoctorStats,
  getAppointmentById,
  updateAppointmentStatus,
  cancelAppointment,
  updateAppointmentPayment,
  reserveSlot,
  createAppointmentFromReservation,
  getCancellationRequests,
  processRefundRequest,
  rejectCancellationRequest,
  getCancellationHistory
} = require("../controllers/appointmentController");

// ─────────────────────────────────────────────────────────────────────────────
// PUBLIC / INTERNAL ROUTES (no auth, called by other services internally)
// ─────────────────────────────────────────────────────────────────────────────

// Doctor-service calls these with a doctor JWT — allowed without extra auth guard
// because the token is still verified in middleware; the specific ID check is
// done in the controller when needed.

// GET  /api/appointments/doctor/:id/stats  ← Used by doctor-service getDashboardStats
router.get("/doctor/:id/stats", authenticate, getDoctorStats);

// GET  /api/appointments/doctor/:id        ← Used by doctor-service getAppointments
router.get("/doctor/:id", authenticate, getAppointmentsByDoctor);

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT AUTH'D ROUTES
// IMPORTANT: Named sub-paths (/patient/upcoming, /patient/past) MUST come
// before the wildcard /patient/:id route to avoid shadowing.
// ─────────────────────────────────────────────────────────────────────────────

// GET  /api/appointments/patient/upcoming  ← Used by dashboard/page.js
router.get("/patient/upcoming", authenticate, getPatientUpcoming);

// GET  /api/appointments/patient/past      ← Used by dashboard/page.js
router.get("/patient/past", authenticate, getPatientPast);

// GET  /api/appointments/patient/:id       ← Fetch all appointments for a patient ID
router.get("/patient/:id", authenticate, getAppointmentsByPatient);

// ─────────────────────────────────────────────────────────────────────────────
// SHARED CRUD ROUTES
// ─────────────────────────────────────────────────────────────────────────────

// Replace the POST route
router.post("/reserve", authenticate, reserveSlot);
router.post("/create-from-reservation", authenticate, createAppointmentFromReservation);
// Remove: router.post("/", authenticate, bookAppointment);
// PATCH /api/appointments/:id/status       ← Doctor accept / reject / complete
router.patch("/:id/status", authenticate, updateAppointmentStatus);

// PUT   /api/appointments/:id/cancel       ← Patient cancel (matches dashboard/page.js)
router.put("/:id/cancel", authenticate, cancelAppointment);

// PATCH /api/appointments/:id/payment      ← Called internally by payment-service
router.patch("/:id/payment", authenticate, updateAppointmentPayment);

// GET  /api/appointments/:id               ← Single appointment lookup
router.get("/:id", authenticate, getAppointmentById);



// ─────────────────────────────────────────────────────────────────────────────
// ADMIN ROUTES (for managing cancellations/refunds)
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/appointments/admin/cancellation-requests - Get all pending refund requests
router.get("/admin/cancellation-requests", getCancellationRequests);

// PUT /api/appointments/admin/cancellation-requests/:id/process - Mark refund as processed
router.put("/admin/cancellation-requests/:id/process", processRefundRequest);

// PUT /api/appointments/admin/cancellation-requests/:id/reject - Reject cancellation
router.put("/admin/cancellation-requests/:id/reject", rejectCancellationRequest);
router.get("/admin/cancellation-history", getCancellationHistory);
module.exports = router;
