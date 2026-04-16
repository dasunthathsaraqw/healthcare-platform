// src/models/AuditLog.js
const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true, // e.g., 'CREATE', 'READ', 'UPDATE', 'DELETE'
  },
  resource: {
    type: String,
    required: true, // e.g., '/api/patients/reports'
  },
  resourceId: {
    type: String, // optional ID of the specific resource
  },
  ip: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  details: {
    type: mongoose.Schema.Types.Mixed, // additional context
  },
}, {
  timestamps: true,
});

// Index for efficient queries
auditLogSchema.index({ userId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);