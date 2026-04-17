// src/routes/metricsRoutes.js
const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticate, authorize, ROLES } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// ── Health Metrics ────────────────────────────────────────────────────────────

// Log a new health metric (blood pressure, weight, heart rate)
router.post(
  '/metrics',
  authorize(ROLES.PATIENT),
  metricsController.logMetric
);

// Get patient's own metrics (with optional ?type=weight&days=30 filtering)
router.get(
  '/metrics',
  authorize(ROLES.PATIENT),
  metricsController.getMyMetrics
);

// Delete a metric entry
router.delete(
  '/metrics/:id',
  authorize(ROLES.PATIENT),
  metricsController.deleteMetric
);

// Get metrics chart data
router.get(
  '/metrics/chart',
  authorize(ROLES.PATIENT),
  metricsController.getMetricsChartData
);

// ── GDPR Data Export ──────────────────────────────────────────────────────────

// Download complete patient data as JSON (profile + reports + metrics)
router.get(
  '/export',
  authorize(ROLES.PATIENT),
  metricsController.exportMyData
);

module.exports = router;
