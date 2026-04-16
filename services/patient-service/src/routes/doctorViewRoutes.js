// src/routes/doctorViewRoutes.js
// Read-only endpoints that doctors use to view patient data.
// All routes require: authentication AND doctor (or admin) role.

const express = require('express');
const router = express.Router();
const doctorViewController = require('../controllers/doctorViewController');
const { authenticateJwtOnly, authorize, ROLES } = require('../middleware/auth');

// JWT-only auth: verifies token signature without a DB lookup.
// Needed because doctors' accounts live in doctor-service DB, not this one.
router.use(authenticateJwtOnly);

// Only doctors and admins may use these routes
const allowDoctorAndAdmin = authorize(ROLES.DOCTOR, ROLES.ADMIN);

// ─── Patient Summary (profile + recent metrics + recent reports) ──────────────
// This is the primary endpoint the appointment UI calls for the "View Details" modal
router.get(
  '/patient/:patientId/summary',
  allowDoctorAndAdmin,
  doctorViewController.getPatientSummary
);

// ─── Individual endpoints (for separate sections / lazy loading) ──────────────

router.get(
  '/patient/:patientId/profile',
  allowDoctorAndAdmin,
  doctorViewController.getPatientProfile
);

router.get(
  '/patient/:patientId/metrics',
  allowDoctorAndAdmin,
  doctorViewController.getPatientMetrics
);

router.get(
  '/patient/:patientId/reports',
  allowDoctorAndAdmin,
  doctorViewController.getPatientReports
);

module.exports = router;
