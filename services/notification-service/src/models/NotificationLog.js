// src/models/NotificationLog.js
const mongoose = require('mongoose');

const notificationLogSchema = new mongoose.Schema({
  recipientId: {
    type: String, // We use String here instead of ObjectId because the User lives in a different Microservice database!
    required: true
  },
  recipientEmail: String,
  recipientPhone: String,
  type: {
    type: String,
    enum: ['EMAIL', 'SMS', 'BOTH'],
    required: true
  },
  eventTrigger: {
    type: String,
    required: true // e.g., 'REPORT_UPLOADED', 'APPOINTMENT_BOOKED'
  },
  status: {
    type: String,
    enum: ['SENT', 'FAILED', 'PENDING'],
    default: 'PENDING'
  },
  errorMessage: String
}, {
  timestamps: true
});

module.exports = mongoose.model('NotificationLog', notificationLogSchema);