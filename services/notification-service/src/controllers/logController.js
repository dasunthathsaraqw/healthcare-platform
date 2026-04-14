const NotificationLog = require('../models/NotificationLog');

exports.getSystemLogs = async (req, res) => {
  try {
    // Fetch the 50 most recent notification logs
    const logs = await NotificationLog.find().sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('Failed to fetch logs:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
};