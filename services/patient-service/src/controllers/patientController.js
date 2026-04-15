// src/controllers/patientController.js
const MedicalReport = require('../models/MedicalReport');
const { Readable } = require('stream');
const { cloudinary } = require('../middleware/upload');
const { publishNotificationEvent } = require('../utils/rabbitmq');
const axios = require('axios');
const User = require('../models/User');
const HealthMetric = require('../models/HealthMetric');

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Standard error response — keeps all shapes consistent.
 */
const errorResponse = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, code: statusCode, message });

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD MEDICAL REPORT
// POST /api/patients/reports
// ─────────────────────────────────────────────────────────────────────────────

exports.uploadMedicalReport = async (req, res) => {
  let uploadedPublicId = null;

  try {
    if (!req.file) {
      return errorResponse(res, 400, 'Please attach a file to upload.');
    }

    const { title, documentType } = req.body;

    if (!title || title.trim().length === 0) {
      return errorResponse(res, 400, 'Please provide a title for this report.');
    }

    if (title.trim().length > 200) {
      return errorResponse(res, 400, 'Report title cannot exceed 200 characters.');
    }

    if (!req.file.buffer || !Buffer.isBuffer(req.file.buffer)) {
      return errorResponse(res, 400, 'Uploaded file is invalid or empty.');
    }

    let uploadedAsset;
    try {
      uploadedAsset = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: 'healthcare_patient_reports',
            resource_type: 'auto',
          },
          (error, result) => {
            if (error) {
              return reject(error);
            }

            if (!result) {
              return reject(new Error('Cloudinary upload failed with no result.'));
            }

            return resolve(result);
          }
        );

        Readable.from(req.file.buffer).pipe(uploadStream);
      });
    } catch (cloudinaryError) {
      return errorResponse(res, 500, cloudinaryError.message);
    }

    uploadedPublicId = uploadedAsset.public_id;

    const report = await MedicalReport.create({
      patientId: req.user._id,
      title: title.trim(),
      documentType: documentType || 'General',
      fileUrl: uploadedAsset.secure_url,
      cloudinaryId: uploadedAsset.public_id,
      uploadedBy: req.user.role,
    });

    // Fire-and-forget RabbitMQ event — notification failure must not block the response
    try {
      void publishNotificationEvent('REPORT_UPLOADED', {
        patientId: req.user._id.toString(),
        patientName: req.user.name,
        patientEmail: req.user.email,
        reportTitle: title.trim(),
        documentType: documentType || 'General',
      }).catch((err) => {
        console.warn(
          'Non-critical: Failed to publish REPORT_UPLOADED event:',
          err.message
        );
      });
    } catch (publishError) {
      console.warn(
        'Non-critical: Synchronous RabbitMQ publish error:',
        publishError.message
      );
    }

    return res.status(201).json({
      success: true,
      message: 'Medical report uploaded successfully.',
      report,
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    // If DB persistence fails after upload, attempt Cloudinary cleanup.
    if (uploadedPublicId) {
      cloudinary.uploader.destroy(uploadedPublicId).catch(() => {});
    }
    return errorResponse(res, 500, 'Failed to upload report. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY REPORTS
// GET /api/patients/reports
// ─────────────────────────────────────────────────────────────────────────────

exports.getMyReports = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      MedicalReport.find({ patientId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      MedicalReport.countDocuments({ patientId: req.user._id }),
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
    console.error('❌ Fetch Reports Error:', error);
    return errorResponse(res, 500, 'Failed to fetch reports. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE REPORT
// DELETE /api/patients/reports/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.deleteReport = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);

    if (!report) {
      return errorResponse(res, 404, 'Report not found.');
    }

    // Ownership check — patients can only delete their own reports; admins can delete any
    if (
      report.patientId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return errorResponse(res, 403, 'You are not authorised to delete this report.');
    }

    // Delete from Cloudinary — non-blocking if Cloudinary is temporarily unavailable
    const cloudinaryResult = await cloudinary.uploader
      .destroy(report.cloudinaryId)
      .catch((err) => {
        console.warn('Cloudinary deletion warning (proceeding anyway):', err.message);
        return null;
      });

    // Delete the DB record regardless of Cloudinary result
    await report.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Report deleted successfully.',
    });
  } catch (error) {
    console.error('❌ Delete Report Error:', error);
    return errorResponse(res, 500, 'Failed to delete report. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MEDICAL HISTORY
// PUT /api/patients/history
// ─────────────────────────────────────────────────────────────────────────────

exports.updateMedicalHistory = async (req, res) => {
  try {
    const { conditions } = req.body;

    // Sanitise: trim each string, deduplicate, remove blanks
    const sanitised = [...new Set(
      conditions
        .map((c) => (typeof c === 'string' ? c.trim() : ''))
        .filter(Boolean)
    )];

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { medicalHistory: sanitised },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return errorResponse(res, 404, 'User account not found.');
    }

    return res.status(200).json({
      success: true,
      message: 'Medical history updated successfully.',
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error('❌ Update History Error:', error);
    return errorResponse(res, 500, 'Failed to update medical history.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET PATIENT DASHBOARD
// GET /api/patients/dashboard
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientDashboard = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5); // Return only the 5 most recent for the dashboard widget

    // Graceful degradation: doctor-service may be temporarily unavailable
    let prescriptions = [];
    try {
      const doctorServiceUrl =
        process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002';
      const response = await axios.get(
        `${doctorServiceUrl}/api/doctors/prescriptions/patient/${req.user._id}`,
        {
          headers: { Authorization: req.headers.authorization },
          timeout: 5000, // Don't hang the dashboard if doctor-service is slow
        }
      );
      prescriptions = response.data.prescriptions || [];
    } catch (apiError) {
      console.warn(
        '⚠️  Could not fetch prescriptions from Doctor Service (graceful degradation):',
        apiError.message
      );
      prescriptions = [];
    }

    return res.status(200).json({
      success: true,
      data: {
        profile: req.user.getPublicProfile(),
        medicalHistory: req.user.medicalHistory,
        recentReports: reports,
        prescriptions,
      },
    });
  } catch (error) {
    console.error('❌ Dashboard Error:', error);
    return errorResponse(res, 500, 'Failed to load dashboard. Please try again.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT DATA
// GET /api/patients/export
// ─────────────────────────────────────────────────────────────────────────────

exports.exportUserData = async (req, res) => {
  try {
    // Extract userId safely from JWT payload populated via the authenticate middleware
    const userId = req.user._id || req.user.userId;
    
    // Fetch user without password
    const userProfile = await User.findById(userId).select('-password');
    if (!userProfile) {
      return errorResponse(res, 404, 'User not found.');
    }

    // Fetch reports & metrics
    const [reports, metrics] = await Promise.all([
      MedicalReport.find({ patientId: userId }).sort({ createdAt: -1 }),
      HealthMetric.find({ patientId: userId }).sort({ recordedAt: -1 })
    ]);

    // Return the aggregated JSON payload
    return res.status(200).json({
      success: true,
      exportDate: new Date().toISOString(),
      user: userProfile,
      reports,
      metrics
    });
  } catch (error) {
    console.error('❌ Data Export Error:', error);
    return errorResponse(res, 500, 'Failed to export user data.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SINGLE PATIENT (used by doctor-service cross-service calls)
// GET /api/patients/:id
// ─────────────────────────────────────────────────────────────────────────────

exports.getPatientById = async (req, res) => {
  try {
    if (!require('mongoose').Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 400, 'Invalid patient ID format.');
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) {
      return errorResponse(res, 404, 'Patient not found.');
    }
    return res.status(200).json({ success: true, patient: user.getPublicProfile() });
  } catch (error) {
    console.error('❌ getPatientById error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient profile.');
  }
};