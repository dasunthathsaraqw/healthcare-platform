const MedicalReport = require('../models/MedicalReport');
const { cloudinary, STORAGE_TYPE } = require('../middleware/upload');
const { publishNotificationEvent } = require('../utils/rabbitmq');
const axios = require('axios');
const User = require('../models/User');
const HealthMetric = require('../models/HealthMetric');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs').promises;

const NOTIFICATION_SERVICE_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://notification-service:3005';


// ─── Helper ───────────────────────────────────────────────────────────────────
const errorResponse = (res, statusCode, message) =>
  res.status(statusCode).json({ success: false, code: statusCode, message });

// ─────────────────────────────────────────────────────────────────────────────
// UPLOAD MEDICAL REPORT
// POST /api/patients/reports
// ─────────────────────────────────────────────────────────────────────────────
exports.uploadMedicalReport = async (req, res) => {
  let uploadedPublicId = null;

  try {
    console.log('[Upload] Received upload request. File present:', !!req.file);
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded. Field name must be "document".');
    }

    if (!req.body) {
      return errorResponse(res, 400, 'Form data is required. Please include title and documentType.');
    }

    const { title, documentType } = req.body;

    if (!title || title.trim().length === 0) {
      return errorResponse(res, 400, 'Title is required.');
    }
    if (title.trim().length > 200) {
      return errorResponse(res, 400, 'Title too long (max 200 chars).');
    }

    console.log(`[Upload] Starting upload. File size: ${req.file.size} bytes`);
    const startTime = Date.now();

    let uploadedAsset;
    let fileUrl;
    let cloudinaryId = null;

    if (STORAGE_TYPE === 'local') {
      // Local storage
      if (!req.file || !req.file.path) {
        return errorResponse(res, 400, 'File upload failed.');
      }
      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      fileUrl = `${baseUrl}/uploads/${req.file.filename}`;
      console.log(`[Upload] Local file saved: ${fileUrl}`);
    } else {
      // Cloudinary upload
      try {
        console.log(`[Upload] Starting Cloudinary upload...`);
        uploadedAsset = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { folder: 'healthcare_patient_reports', resource_type: 'auto' },
            (error, result) => {
              if (error) return reject(error);
              if (!result) return reject(new Error('No result from Cloudinary'));
              resolve(result);
            }
          );
          uploadStream.end(req.file.buffer);
        });
        fileUrl = uploadedAsset.secure_url;
        cloudinaryId = uploadedAsset.public_id;
        uploadedPublicId = cloudinaryId; // for cleanup
        console.log(`[Upload] Cloudinary upload success: ${fileUrl}`);
      } catch (cloudinaryError) {
        console.error('❌ Cloudinary upload error:', cloudinaryError);
        return errorResponse(res, 500, cloudinaryError.message);
      }
    }

    console.log(`[Upload] Upload completed in ${Date.now() - startTime}ms`);

    // Save to database
    const report = await MedicalReport.create({
      patientId: req.user._id,
      title: title.trim(),
      documentType: documentType || 'General',
      fileUrl: fileUrl,
      cloudinaryId: cloudinaryId,
      uploadedBy: req.user.role,
    });

    // Notification (fire-and-forget)
    try {
      publishNotificationEvent('REPORT_UPLOADED', {
        patientId: req.user._id.toString(),
        patientName: req.user.name,
        patientEmail: req.user.email,
        reportTitle: title.trim(),
        documentType: documentType || 'General',
      }).catch(err => console.warn('Notification event failed:', err.message));
    } catch (err) {
      console.warn('Notification publish error:', err.message);
    }

    return res.status(201).json({
      success: true,
      message: 'Medical report uploaded successfully.',
      report,
    });
  } catch (error) {
    console.error('❌ Upload Error:', error);
    if (uploadedPublicId) {
      cloudinary.uploader.destroy(uploadedPublicId).catch(() => {});
    }
    return errorResponse(res, 500, 'Failed to upload report.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET MY REPORTS (unchanged but included for completeness)
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
// DELETE REPORT (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.deleteReport = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);
    if (!report) return errorResponse(res, 404, 'Report not found.');

    if (
      report.patientId.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return errorResponse(res, 403, 'You are not authorised to delete this report.');
    }

    if (report.cloudinaryId) {
      await cloudinary.uploader.destroy(report.cloudinaryId).catch(err => {
        console.warn('Cloudinary deletion warning:', err.message);
      });
    }
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
// GET MY PRESCRIPTIONS (proxy to doctor service)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyPrescriptions = async (req, res) => {
  try {
    const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002';
    const response = await axios.get(
      `${doctorServiceUrl}/api/doctors/prescriptions/patient/${req.user._id}`,
      { headers: { Authorization: req.headers.authorization }, timeout: 5000 }
    );
    return res.status(200).json({
      success: true,
      prescriptions: response.data.prescriptions || []
    });
  } catch (error) {
    console.warn('Failed to fetch prescriptions:', error.message);
    return res.status(200).json({ success: true, prescriptions: [] });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GENERATE SHARE LINK FOR REPORT
// POST /api/patients/reports/:id/share
// ─────────────────────────────────────────────────────────────────────────────
exports.generateShareLink = async (req, res) => {
  try {
    const report = await MedicalReport.findOne({ _id: req.params.id, patientId: req.user._id });
    if (!report) return errorResponse(res, 404, 'Report not found');
    
    // Create a JWT with short expiry that grants read access to this report
    const jwt = require('jsonwebtoken');
    const token = jwt.sign(
      { reportId: report._id, patientId: req.user._id },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/shared/report/${token}`;
    
    return res.status(200).json({
      success: true,
      shareUrl,
      expiresIn: '7 days'
    });
  } catch (error) {
    console.error('❌ Generate Share Link Error:', error);
    return errorResponse(res, 500, 'Failed to generate share link.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE MEDICAL HISTORY (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { conditions } = req.body;
    const sanitised = [...new Set(
      conditions.map(c => (typeof c === 'string' ? c.trim() : '')).filter(Boolean)
    )];

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { medicalHistory: sanitised },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) return errorResponse(res, 404, 'User account not found.');

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
// GET PATIENT DASHBOARD (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPatientDashboard = async (req, res) => {
  try {
    const reports = await MedicalReport.find({ patientId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    let prescriptions = [];
    try {
      const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002';
      const response = await axios.get(
        `${doctorServiceUrl}/api/doctors/prescriptions/patient/${req.user._id}`,
        { headers: { Authorization: req.headers.authorization }, timeout: 5000 }
      );
      prescriptions = response.data.prescriptions || [];
    } catch (apiError) {
      console.warn('⚠️ Could not fetch prescriptions:', apiError.message);
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
    return errorResponse(res, 500, 'Failed to load dashboard.');
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT USER DATA (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.getMyNotifications = async (req, res) => {
  try {
    const limit = Number.parseInt(req.query.limit, 10);
    const response = await axios.get(`${NOTIFICATION_SERVICE_URL}/api/notifications/patient`, {
      params: {
        patientId: req.user._id?.toString(),
        email: req.user.email,
        ...(Number.isInteger(limit) && limit > 0 ? { limit } : {}),
      },
      headers: { Authorization: req.headers.authorization },
      timeout: 5000,
    });

    return res.status(200).json({
      success: true,
      count: response.data.count || 0,
      notifications: response.data.notifications || [],
    });
  } catch (error) {
    console.error('Fetch Patient Notifications Error:', error.message);
    return errorResponse(res, 500, 'Failed to fetch notifications.');
  }
};

exports.exportUserData = async (req, res) => {
  try {
    const userId = req.user._id || req.user.userId;
    const userProfile = await User.findById(userId).select('-password');
    if (!userProfile) return errorResponse(res, 404, 'User not found.');

    const [reports, metrics] = await Promise.all([
      MedicalReport.find({ patientId: userId }).sort({ createdAt: -1 }),
      HealthMetric.find({ patientId: userId }).sort({ recordedAt: -1 })
    ]);

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
// GET SINGLE PATIENT (unchanged)
// ─────────────────────────────────────────────────────────────────────────────
exports.getPatientById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return errorResponse(res, 400, 'Invalid patient ID format.');
    }
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return errorResponse(res, 404, 'Patient not found.');
    return res.status(200).json({ success: true, patient: user.getPublicProfile() });
  } catch (error) {
    console.error('❌ getPatientById error:', error);
    return errorResponse(res, 500, 'Failed to retrieve patient profile.');
  }
};
