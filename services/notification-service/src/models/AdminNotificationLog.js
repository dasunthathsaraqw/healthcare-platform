// src/models/AdminNotificationLog.js
const mongoose = require('mongoose');

const adminNotificationLogSchema = new mongoose.Schema({
  adminId: {
    type: String,
    required: true
  },
  recipientId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  sentAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['SENT', 'FAILED', 'PENDING'],
    default: 'PENDING'
  },
  errorMessage: String,
  deliveryMethods: [{
    type: String,
    enum: ['EMAIL', 'SMS']
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('AdminNotificationLog', adminNotificationLogSchema);