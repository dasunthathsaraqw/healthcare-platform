// src/routes/patientRoutes-auth.js
const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');

// Apply authentication middleware to all routes below this line
router.use(authenticate);

// Report Routes
// Notice how we inject 'upload.single("document")' right before the controller!
router.post(
  '/reports', 
  authorize(ROLES.PATIENT, ROLES.DOCTOR), 
  upload.single('document'), // 'document' is the name of the form field the frontend must use
  patientController.uploadMedicalReport
);

router.get(
  '/reports', 
  authorize(ROLES.PATIENT), 
  patientController.getMyReports
);

router.delete(
  '/reports/:id', 
  authorize(ROLES.PATIENT, ROLES.ADMIN), 
  patientController.deleteReport
);


// Medical History & Dashboard Routes
router.put(
  '/history', 
  authorize(ROLES.PATIENT), 
  patientController.updateMedicalHistory
);

router.get(
  '/dashboard', 
  authorize(ROLES.PATIENT), 
  patientController.getPatientDashboard
);

// ==========================================
// ADMIN ONLY ROUTES
// ==========================================
// We use authorize(ROLES.ADMIN) to block patients and doctors from using these

router.get(
  '/admin/users', 
  authorize(ROLES.ADMIN), 
  adminController.getAllUsers
);

router.patch(
  '/admin/doctors/:id/verify', 
  authorize(ROLES.ADMIN), 
  adminController.verifyDoctor
);

router.patch(
  '/admin/users/:id/status', 
  authorize(ROLES.ADMIN), 
  adminController.toggleUserStatus
);

module.exports = router;