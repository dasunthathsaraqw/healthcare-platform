// src/controllers/doctorViewController.js
// Doctor-facing read-only views into patient data.
// All routes here require authentication + doctor (or admin) role.

const User = require('../models/User');
const HealthMetric = require('../models/HealthMetric');
const MedicalReport = require('../models/MedicalReport');

const errorResponse = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, code: statusCode, message });

// ─────────────────────────────────────────────────────────────────────────────
// GET PATIENT FULL PROFILE
// GET /api/patients/doctor/patient/:patientId/profile
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientProfile = async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId).select('-password -__v');
    if (!patient || patient.role !== 'patient') {
      return errorResponse(res, 404, 'Patient not found.');
    }

    return res.status(200).json({
      success: true,
      patient: patient.getPublicProfile(),
    });
  } catch (error) {
    console.error('❌ doctorView.getPatientProfile error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient profile.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PATIENT HEALTH METRICS
// GET /api/patients/doctor/patient/:patientId/metrics?type=weight&days=30
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientMetrics = async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId).select('_id role');
    if (!patient || patient.role !== 'patient') {
      return errorResponse(res, 404, 'Patient not found.');
    }

    const { type, days } = req.query;
    const query = { patientId: req.params.patientId };

    if (type) query.type = type;

    const daysBack = Math.min(parseInt(days) || 90, 365); // max 1 year
    const since = new Date();
    since.setDate(since.getDate() - daysBack);
    query.recordedAt = { $gte: since };

    const metrics = await HealthMetric.find(query)
      .sort({ recordedAt: -1 })
      .limit(200);

    // Group by type for easy charting on the frontend
    const grouped = metrics.reduce((acc, m) => {
      if (!acc[m.type]) acc[m.type] = [];
      acc[m.type].push(m);
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      count: metrics.length,
      metrics,
      grouped,
    });
  } catch (error) {
    console.error('❌ doctorView.getPatientMetrics error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient health metrics.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PATIENT MEDICAL REPORTS
// GET /api/patients/doctor/patient/:patientId/reports
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientReports = async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId).select('_id role');
    if (!patient || patient.role !== 'patient') {
      return errorResponse(res, 404, 'Patient not found.');
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      MedicalReport.find({ patientId: req.params.patientId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MedicalReport.countDocuments({ patientId: req.params.patientId }),
    ]);

    return res.status(200).json({
      success: true,
      count: reports.length,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      reports,
    });
  } catch (error) {
    console.error('❌ doctorView.getPatientReports error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient medical reports.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET FULL PATIENT SUMMARY (profile + recent metrics + recent reports in one shot)
// GET /api/patients/doctor/patient/:patientId/summary
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientSummary = async (req, res) => {
  try {
    const patient = await User.findById(req.params.patientId).select('-password -__v');
    if (!patient || patient.role !== 'patient') {
      return errorResponse(res, 404, 'Patient not found.');
    }

    // Fetch recent data in parallel
    const since30 = new Date();
    since30.setDate(since30.getDate() - 30);

    const [recentMetrics, recentReports] = await Promise.all([
      HealthMetric.find({ patientId: req.params.patientId, recordedAt: { $gte: since30 } })
        .sort({ recordedAt: -1 })
        .limit(50),
      MedicalReport.find({ patientId: req.params.patientId })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // Group metrics by type for the UI
    const metricsGrouped = recentMetrics.reduce((acc, m) => {
      if (!acc[m.type]) acc[m.type] = [];
      acc[m.type].push({
        value: m.value,
        unit: m.unit,
        notes: m.notes,
        recordedAt: m.recordedAt,
        _id: m._id,
      });
      return acc;
    }, {});

    return res.status(200).json({
      success: true,
      patient: patient.getPublicProfile(),
      metrics: {
        recent: recentMetrics,
        grouped: metricsGrouped,
        count: recentMetrics.length,
      },
      reports: {
        recent: recentReports,
        count: recentReports.length,
      },
    });
  } catch (error) {
    console.error('❌ doctorView.getPatientSummary error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient summary.');
  }
};
