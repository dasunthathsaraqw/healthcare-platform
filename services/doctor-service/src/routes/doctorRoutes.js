const express = require("express");
const router = express.Router();
const multer = require("multer");
const { uploadProfilePicture } = require("../controllers/doctorController");

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
  getPrescriptionsByPatient,
  deletePrescription,
  getPatients,
  getPatientDetails,
  getDashboardStats,
  searchDoctors,
  getPublicDoctorProfile,
  getPublicDoctorAvailability,
} = require("../controllers/doctorController");
const { authenticate } = require("../middleware/auth");

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(file.mimetype);
    if (extname) {
      return cb(null, true);
    }
    cb(new Error("Only image files are allowed"));
  }
});

// ── Public routes (no auth) ──────────────────────────────────────────────────

router.post("/register", doctorRegister);
router.post("/login", doctorLogin);

// Patient-facing: search all verified doctors
router.get("/", searchDoctors);

// IMPORTANT: The /:id wildcard routes MUST be at the end, not here.

// ── Protected routes (JWT required) ─────────────────────────────────────────

// Profile
router.get("/profile", authenticate, getDoctorProfile);
router.put("/profile", authenticate, updateDoctorProfile);
router.put("/change-password", authenticate, changePassword);

// Availability
router.get("/availability", authenticate, getAvailability);
router.post("/availability", authenticate, addAvailability);
router.put("/availability/:id", authenticate, updateAvailability);
router.delete("/availability/:id", authenticate, deleteAvailability);

// Appointments
router.get("/appointments", authenticate, getAppointments);
router.put("/appointments/:id/accept", authenticate, acceptAppointment);
router.put("/appointments/:id/reject", authenticate, rejectAppointment);
router.put("/appointments/:id/complete", authenticate, completeAppointment);

// Prescriptions
router.get("/prescriptions", authenticate, getPrescriptions);
router.post("/prescriptions", authenticate, issuePrescription);
router.get("/prescriptions/patient/:patientId", getPrescriptionsByPatient);
router.delete("/prescriptions/:prescriptionId", deletePrescription);



// Patients
router.get("/patients", authenticate, getPatients);
router.get("/patients/:patientId", authenticate, getPatientDetails);

// Dashboard
router.get("/dashboard/stats", authenticate, getDashboardStats);

// ── Public Wildcard routes (MUST BE LAST) ──────────────────────────────────
router.get("/:id/availability", getPublicDoctorAvailability);
router.get("/:id", getPublicDoctorProfile);

router.post("/upload-profile-picture", authenticate, upload.single("profilePicture"), uploadProfilePicture);

module.exports = router;
