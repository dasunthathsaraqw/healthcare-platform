// src/routes/patientRoutes-auth.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const patientController = require('../controllers/patientController');
const { authenticate, authorize, ROLES } = require('../middleware/auth');
const upload = require('../middleware/upload');
const adminController = require('../controllers/adminController');
const {
  validateMedicalHistory,
  handleValidationErrors,
} = require('../middleware/validate');

// Apply authentication middleware to all routes below this line
router.use(authenticate);

// Report Routes
// Notice how we wrap 'upload.single("document")' to prevent infinite hangs!
// POST /reports
// POST /reports - with diagnostic logging
router.post(
  '/reports',
  authorize(ROLES.PATIENT, ROLES.DOCTOR),
  (req, res, next) => {
    console.log('[DEBUG] Before multer - Content-Type:', req.headers['content-type']);
    console.log('[DEBUG] Before multer - Body keys:', req.body ? Object.keys(req.body) : 'req.body is null/undefined');
    console.log('[DEBUG] Before multer - Is multipart?', req.is('multipart'));
    next();
  },
  upload.single('document'),
  (req, res, next) => {
    console.log('[DEBUG] After multer - req.file:', req.file ? 'present' : 'undefined');
    console.log('[DEBUG] After multer - req.body:', req.body || 'null/undefined');
    if (!req.file) {
      console.log('[DEBUG] No file attached! Check field name or file size.');
    }
    next();
  },
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


// Prescription Routes
router.get(
  '/prescriptions',
  authorize(ROLES.PATIENT),
  patientController.getMyPrescriptions
);

// Report Sharing
router.post(
  '/reports/:id/share',
  authorize(ROLES.PATIENT),
  patientController.generateShareLink
);

// Medical History & Dashboard Routes
router.put(
  '/history',
  authorize(ROLES.PATIENT),
  validateMedicalHistory,
  handleValidationErrors,
  patientController.updateMedicalHistory
);

router.get(
  '/dashboard',
  authorize(ROLES.PATIENT),
  patientController.getPatientDashboard
);

// Export Data
router.get(
  '/export',
  authorize(ROLES.PATIENT, ROLES.DOCTOR, ROLES.ADMIN),
  patientController.exportUserData
);

// Moved cross-service route further down to prevent route shadowing

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

// Admin Notifications
router.post(
  '/admin/notifications/send',
  authorize(ROLES.ADMIN),
  adminController.sendNotification
);

router.get(
  '/admin/notifications',
  authorize(ROLES.ADMIN),
  adminController.getNotifications
);

// ==========================================
// CROSS-SERVICE ROUTES
// ==========================================
// Doctor service calls this to get patient profile. 
// Kept at the bottom so /:id does not shadow other routes like /admin/... or /metrics via router merging.
router.get(
  '/:id',
  (req, res, next) => {
    // Skip this route for non-ObjectId values so paths like /metrics can be handled by other routers.
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return next('route');
    next();
  },
  patientController.getPatientById
);

module.exports = router;