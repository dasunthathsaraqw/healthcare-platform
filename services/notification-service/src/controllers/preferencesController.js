// src/controllers/preferencesController.js
const NotificationPreference = require('../models/NotificationPreference');
const mongoose = require('mongoose');

// ─────────────────────────────────────────────────────────────────────────────
// GET PREFERENCES
// GET /api/notifications/preferences
// ─────────────────────────────────────────────────────────────────────────────

exports.getPreferences = async (req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'Database connection unavailable.' });
    }

    const recipientId = req.user?.userId || req.query.recipientId;
    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required.' });
    }

    // Upsert: return existing or create default preferences
    let prefs = await NotificationPreference.findOne({ recipientId });
    if (!prefs) {
      prefs = await NotificationPreference.create({ recipientId });
    }

    return res.status(200).json({ success: true, preferences: prefs });
  } catch (error) {
    console.error('❌ Get Preferences Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch preferences.' });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PREFERENCES
// PUT /api/notifications/preferences
// ─────────────────────────────────────────────────────────────────────────────

exports.updatePreferences = async (req, res) => {
  try {
    const recipientId = req.user?.userId || req.body.recipientId;
    if (!recipientId) {
      return res.status(400).json({ success: false, message: 'recipientId is required.' });
    }

    const {
      emailEnabled,
      smsEnabled,
      eventPreferences,
      quietHoursStart,
      quietHoursEnd,
    } = req.body;

    const updateData = {};
    if (typeof emailEnabled === 'boolean') updateData.emailEnabled = emailEnabled;
    if (typeof smsEnabled === 'boolean') updateData.smsEnabled = smsEnabled;
    if (quietHoursStart !== undefined) updateData.quietHoursStart = quietHoursStart;
    if (quietHoursEnd !== undefined) updateData.quietHoursEnd = quietHoursEnd;

    // Merge event preferences if provided
    if (eventPreferences && typeof eventPreferences === 'object') {
      for (const [key, val] of Object.entries(eventPreferences)) {
        if (typeof val === 'boolean') {
          updateData[`eventPreferences.${key}`] = val;
        }
      }
    }

    const prefs = await NotificationPreference.findOneAndUpdate(
      { recipientId },
      { $set: updateData },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Notification preferences updated.',
      preferences: prefs,
    });
  } catch (error) {
    console.error('❌ Update Preferences Error:', error);
    return res.status(500).json({ success: false, message: 'Failed to update preferences.' });
  }
};
