// src/models/NotificationPreference.js
const mongoose = require('mongoose');

const notificationPreferenceSchema = new mongoose.Schema({
  recipientId: {
    type: String, // String (not ObjectId) because User lives in patient-service DB
    required: true,
    unique: true,
    index: true,
  },
  emailEnabled: {
    type: Boolean,
    default: true,
  },
  smsEnabled: {
    type: Boolean,
    default: false, // SMS opt-in by default for cost control
  },
  // Granular event preferences
  eventPreferences: {
    REPORT_UPLOADED: { type: Boolean, default: true },
    APPOINTMENT_BOOKED: { type: Boolean, default: true },
    APPOINTMENT_CANCELLED: { type: Boolean, default: true },
    PRESCRIPTION_ISSUED: { type: Boolean, default: true },
    SYSTEM_ALERT: { type: Boolean, default: true },
  },
  quietHoursStart: {
    type: String, // "22:00" format
    default: null,
  },
  quietHoursEnd: {
    type: String, // "07:00" format
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('NotificationPreference', notificationPreferenceSchema);
