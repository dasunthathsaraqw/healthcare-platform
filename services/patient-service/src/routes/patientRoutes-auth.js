// src/routes/patientRoutes-auth.js
const express = require('express');
const router = express.Router();
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
router.post(
  '/reports', 
  authorize(ROLES.PATIENT, ROLES.DOCTOR), 
  (req, res, next) => {
    const uploader = upload.single('document');
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        return res.status(504).json({ success: false, message: 'File upload to Cloudinary timed out.' });
      }
    }, 15000); // 15s absolute timeout for upload
    
    uploader(req, res, (err) => {
      clearTimeout(timeout);
      if (err) {
        console.error('File Upload Error:', err);
        if (!res.headersSent) return res.status(500).json({ success: false, message: 'Upload failed: ' + err.message });
        return;
      }
      next();
    });
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

// ==========================================
// CROSS-SERVICE ROUTES
// ==========================================
// Doctor service calls this to get patient profile. 
// Kept at the bottom so /:id does not shadow other routes like /admin/... or /metrics via router merging.
router.get(
  '/:id',
  patientController.getPatientById
);

module.exports = router;