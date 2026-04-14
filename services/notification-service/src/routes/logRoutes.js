const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// In a real production app, this would be protected by an Admin middleware!
router.get('/', logController.getSystemLogs);

module.exports = router;