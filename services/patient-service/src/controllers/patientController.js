// src/controllers/patientController.js
const MedicalReport = require('../models/MedicalReport');
const cloudinary = require('cloudinary').v2;
const { publishNotificationEvent } = require('../utils/rabbitmq');
const axios = require('axios'); 
const User = require('../models/User');

/**
 * @desc    Upload a new medical report to Cloudinary & save to DB
 * @route   POST /api/patients/reports
 * @access  Private (Patient/Doctor)
 */
exports.uploadMedicalReport = async (req, res) => {
  try {
    // 1. Check if the file was actually uploaded by the middleware
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a file' });
    }

    const { title, documentType } = req.body;

    // 2. Validate input
    if (!title) {
      // If validation fails, we should delete the file that was just uploaded to Cloudinary to save space!
      await cloudinary.uploader.destroy(req.file.filename);
      return res.status(400).json({ success: false, message: 'Please provide a title for the report' });
    }

    // 3. Create the database record
    // req.file.path is the secure URL from Cloudinary
    // req.file.filename is the unique ID Cloudinary gave it
    const report = await MedicalReport.create({
      patientId: req.user._id, // Gotten from your auth middleware
      title: title,
      documentType: documentType || 'General',
      fileUrl: req.file.path,
      cloudinaryId: req.file.filename, 
      uploadedBy: req.user.role
    });

    // --- NEW: PHASE 3 RABBITMQ TRIGGER ---
    // We send this to the queue so the Notification Service can email the patient!
    await publishNotificationEvent('REPORT_UPLOADED', {
      patientId: req.user._id,
      patientName: req.user.name,
      patientEmail: req.user.email,
      reportTitle: title,
      documentType: documentType || 'General'
    });
    // -------------------------------------

    // 4. Send success response
    res.status(201).json({
      success: true,
      message: 'Medical report uploaded successfully',
      report: report
    });

  } catch (error) {
    console.error('Upload Error:', error);
    res.status(500).json({ success: false, message: 'Failed to upload report', error: error.message });
  }
};

/**
 * @desc    Get all medical reports for the logged-in patient
 * @route   GET /api/patients/reports
 * @access  Private (Patient)
 */
exports.getMyReports = async (req, res) => {
  try {
    // Fetch reports sorted by newest first
    const reports = await MedicalReport.find({ patientId: req.user._id }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      reports: reports
    });
  } catch (error) {
    console.error('Fetch Reports Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reports', error: error.message });
  }
};

/**
 * @desc    Delete a specific medical report
 * @route   DELETE /api/patients/reports/:id
 * @access  Private (Patient)
 */
exports.deleteReport = async (req, res) => {
  try {
    // 1. Find the report in the database
    const report = await MedicalReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ success: false, message: 'Report not found' });
    }

    // 2. Security Check: Make sure the logged-in user actually owns this report
    if (report.patientId.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this report' });
    }

    // 3. Delete the file from Cloudinary completely
    await cloudinary.uploader.destroy(report.cloudinaryId);

    // 4. Delete the record from MongoDB
    await report.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Report deleted successfully'
    });
  } catch (error) {
    console.error('Delete Report Error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete report', error: error.message });
  }
};

/**
 * @desc    Update text-based medical history (e.g., adding chronic conditions)
 * @route   PUT /api/patients/history
 * @access  Private (Patient)
 */
exports.updateMedicalHistory = async (req, res) => {
  try {
    const { conditions } = req.body; // Expecting an array of strings: ["Diabetes", "Asthma"]

    if (!Array.isArray(conditions)) {
      return res.status(400).json({ success: false, message: 'Conditions must be an array of strings' });
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { medicalHistory: conditions },
      { new: true, runValidators: true }
    ).select('-password');

    res.status(200).json({
      success: true,
      message: 'Medical history updated',
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Update History Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update medical history' });
  }
};

/**
 * @desc    Get complete Patient Dashboard (Profile + Reports + Inter-Service Prescriptions)
 * @route   GET /api/patients/dashboard
 * @access  Private (Patient)
 */
exports.getPatientDashboard = async (req, res) => {
  try {
    // 1. Get the patient's local reports
    const reports = await MedicalReport.find({ patientId: req.user._id }).sort({ createdAt: -1 });

    // 2. Fetch Prescriptions from the DOCTOR SERVICE (Inter-Service Communication)
    let prescriptions = [];
    try {
      // Notice we use 'doctor-service:3002' - This is Docker's internal DNS routing!
      const doctorServiceUrl = process.env.DOCTOR_SERVICE_URL || 'http://doctor-service:3002';
      
      const response = await axios.get(`${doctorServiceUrl}/api/doctors/prescriptions/patient/${req.user._id}`, {
        // Pass the user's JWT token along to the doctor service for security
        headers: { Authorization: req.headers.authorization }
      });
      
      prescriptions = response.data.prescriptions || [];
    } catch (apiError) {
      console.error('⚠️ Could not fetch prescriptions from Doctor Service. Is it running?');
      // We don't crash the whole dashboard if the doctor service is down. 
      // This is a microservices best practice called "Graceful Degradation".
      prescriptions = [{ message: "Doctor service temporarily unavailable. Cannot load prescriptions right now." }];
    }

    // 3. Send the unified response
    res.status(200).json({
      success: true,
      data: {
        profile: req.user.getPublicProfile(),
        medicalHistory: req.user.medicalHistory,
        recentReports: reports,
        prescriptions: prescriptions
      }
    });

  } catch (error) {
    console.error('Dashboard Error:', error);
    res.status(500).json({ success: false, message: 'Failed to load dashboard' });
  }
};