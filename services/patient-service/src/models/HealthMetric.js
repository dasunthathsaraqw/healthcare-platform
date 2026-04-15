// src/models/HealthMetric.js
const mongoose = require('mongoose');

const healthMetricSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['blood_pressure', 'weight', 'heart_rate'],
    required: [true, 'Metric type is required'],
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: [true, 'Metric value is required'],
    // blood_pressure: { systolic: Number, diastolic: Number }
    // weight: Number (kg)
    // heart_rate: Number (bpm)
  },
  unit: {
    type: String,
    required: true,
    // 'mmHg', 'kg', 'bpm'
  },
  notes: {
    type: String,
    maxlength: 500,
    default: '',
  },
  recordedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Compound index for efficient patient + date queries
healthMetricSchema.index({ patientId: 1, type: 1, recordedAt: -1 });

module.exports = mongoose.model('HealthMetric', healthMetricSchema);
