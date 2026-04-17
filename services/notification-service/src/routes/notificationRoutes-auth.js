const express = require("express");
const router = express.Router();
const preferencesController = require('../controllers/preferencesController');
const patientNotificationsController = require("../controllers/patientNotificationsController");

// ── JWT verification middleware (lightweight — notification-service has no User model) ──
const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.user = decoded; // { userId, role, ... }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token.' });
  }
};

// Apply auth to all preference routes
router.use(authenticateToken);

// GET  /api/notifications/preferences — fetch current preferences (auto-creates defaults)
router.get('/preferences', preferencesController.getPreferences);

// PUT  /api/notifications/preferences — toggle email/sms, event preferences, quiet hours
router.put('/preferences', preferencesController.updatePreferences);

router.get('/patient', patientNotificationsController.getPatientNotifications);

// Keep the original placeholder route
router.get("/", (req, res) => {
  res.json({ message: "Notification routes active", userId: req.user?.userId });
});

module.exports = router;
