// src/controllers/metricsController.js
const HealthMetric = require('../models/HealthMetric');
const User = require('../models/User');
const MedicalReport = require('../models/MedicalReport');

const errorResponse = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, code: statusCode, message });

// ─────────────────────────────────────────────────────────────────────────────
// LOG HEALTH METRIC
// POST /api/patients/metrics
// ─────────────────────────────────────────────────────────────────────────────

exports.logMetric = async (req, res) => {
  try {
    const { type, value, unit, notes, recordedAt } = req.body;

    if (!type || !value || !unit) {
      return errorResponse(res, 400, 'type, value, and unit are required.');
    }

    const VALID_TYPES = ['blood_pressure', 'weight', 'heart_rate'];
    if (!VALID_TYPES.includes(type)) {
      return errorResponse(res, 400, `Invalid type. Must be one of: ${VALID_TYPES.join(', ')}`);
    }

    // Type-specific validation
    if (type === 'blood_pressure') {
      if (!value.systolic || !value.diastolic) {
        return errorResponse(res, 400, 'Blood pressure requires systolic and diastolic values.');
      }
      if (value.systolic < 50 || value.systolic > 300 || value.diastolic < 30 || value.diastolic > 200) {
        return errorResponse(res, 400, 'Blood pressure values are out of valid range.');
      }
    }

    if (type === 'weight' && (value < 1 || value > 500)) {
      return errorResponse(res, 400, 'Weight must be between 1 and 500 kg.');
    }

    if (type === 'heart_rate' && (value < 20 || value > 300)) {
      return errorResponse(res, 400, 'Heart rate must be between 20 and 300 bpm.');
    }

    const metric = await HealthMetric.create({
      patientId: req.user._id,
      type,
      value,
      unit,
      notes: notes || '',
      recordedAt: recordedAt || new Date(),
    });

    return res.status(201).json({
      success: true,
      message: 'Health metric logged successfully.',
      metric,
    });
  } catch (error) {
    console.error('❌ Log Metric Error:', error);
    return errorResponse(res, 500, 'Failed to log health metric.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY METRICS
// GET /api/patients/metrics?type=weight&days=30
// ─────────────────────────────────────────────────────────────────────────────

exports.getMyMetrics = async (req, res) => {
  try {
    const { type, days } = req.query;

    const query = { patientId: req.user._id };
    if (type) query.type = type;

    const daysBack = parseInt(days) || 30;
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    query.recordedAt = { $gte: since };

    const metrics = await HealthMetric.find(query)
      .sort({ recordedAt: -1 })
      .limit(200);

    return res.status(200).json({
      success: true,
      count: metrics.length,
      metrics,
    });
  } catch (error) {
    console.error('❌ Get Metrics Error:', error);
    return errorResponse(res, 500, 'Failed to fetch health metrics.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE METRIC
// DELETE /api/patients/metrics/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.deleteMetric = async (req, res) => {
  try {
    const metric = await HealthMetric.findById(req.params.id);
    if (!metric) return errorResponse(res, 404, 'Metric not found.');

    if (metric.patientId.toString() !== req.user._id.toString()) {
      return errorResponse(res, 403, 'You can only delete your own metrics.');
    }

    await metric.deleteOne();
    return res.status(200).json({ success: true, message: 'Metric deleted.' });
  } catch (error) {
    console.error('❌ Delete Metric Error:', error);
    return errorResponse(res, 500, 'Failed to delete metric.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT PATIENT DATA (GDPR-style)
// GET /api/patients/export
// ─────────────────────────────────────────────────────────────────────────────

exports.exportMyData = async (req, res) => {
  try {
    const [profile, reports, metrics] = await Promise.all([
      User.findById(req.user._id).select('-password -__v'),
      MedicalReport.find({ patientId: req.user._id }).sort({ createdAt: -1 }),
      HealthMetric.find({ patientId: req.user._id }).sort({ recordedAt: -1 }),
    ]);

    if (!profile) return errorResponse(res, 404, 'User not found.');

    const exportData = {
      exportedAt: new Date().toISOString(),
      format: 'GDPR_DATA_EXPORT_v1',
      patient: {
        name: profile.name,
        email: profile.email,
        phone: profile.phone,
        dateOfBirth: profile.dateOfBirth,
        address: profile.address,
        medicalHistory: profile.medicalHistory,
        accountCreated: profile.createdAt,
      },
      medicalReports: reports.map((r) => ({
        title: r.title,
        documentType: r.documentType,
        fileUrl: r.fileUrl,
        uploadedBy: r.uploadedBy,
        uploadedAt: r.createdAt,
      })),
      healthMetrics: metrics.map((m) => ({
        type: m.type,
        value: m.value,
        unit: m.unit,
        notes: m.notes,
        recordedAt: m.recordedAt,
      })),
      summary: {
        totalReports: reports.length,
        totalMetrics: metrics.length,
        medicalConditions: profile.medicalHistory?.length || 0,
      },
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="patient-data-export-${Date.now()}.json"`
    );
    return res.status(200).json(exportData);
  } catch (error) {
    console.error('❌ Export Data Error:', error);
    return errorResponse(res, 500, 'Failed to export patient data.');
  }
};
