// src/controllers/adminController.js
const User = require('../models/User');
const { publishNotificationEvent } = require('../utils/rabbitmq');

/**
 * @desc    Get all users (with filtering and pagination)
 * @route   GET /api/patients/admin/users
 * @access  Private (Admin Only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    // A+ Feature: Allow the frontend to filter by role (e.g., ?role=doctor)
    const filter = {};
    if (req.query.role) {
      filter.role = req.query.role;
    }

    // Fetch users, excluding passwords, sorted by newest first
    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: users.length,
      users
    });
  } catch (error) {
    console.error('Fetch Users Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};

/**
 * @desc    Verify a doctor's registration
 * @route   PATCH /api/patients/admin/doctors/:id/verify
 * @access  Private (Admin Only)
 */
exports.verifyDoctor = async (req, res) => {
  try {
    const doctor = await User.findById(req.params.id);

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (doctor.role !== 'doctor') {
      return res.status(400).json({ success: false, message: 'This user is not a doctor' });
    }

    // Toggle the verification status
    doctor.isVerified = true;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: 'Doctor has been successfully verified',
      doctor: doctor.getPublicProfile()
    });
  } catch (error) {
    console.error('Verify Doctor Error:', error);
    res.status(500).json({ success: false, message: 'Failed to verify doctor' });
  }
};

/**
 * @desc    Activate or Deactivate a user account
 * @route   PATCH /api/patients/admin/users/:id/status
 * @access  Private (Admin Only)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'You cannot deactivate your own admin account' });
    }

    // Toggle the active status (e.g., banning a bad user)
    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User account has been ${user.isActive ? 'activated' : 'deactivated'}`,
      user: user.getPublicProfile()
    });
  } catch (error) {
    console.error('Toggle Status Error:', error);
    res.status(500).json({ success: false, message: 'Failed to update user status' });
  }
};

/**
 * @desc    Send notification to patients
 * @route   POST /api/patients/admin/notifications/send
 * @access  Private (Admin Only)
 */
exports.sendNotification = async (req, res) => {
  try {
    const { recipientId, subject, message, sendEmail, sendSMS } = req.body;

    if (!subject || !message) {
      return res.status(400).json({ success: false, message: 'Subject and message are required' });
    }

    if (!sendEmail && !sendSMS) {
      return res.status(400).json({ success: false, message: 'At least one delivery method must be selected' });
    }

    let recipients = [];

    if (recipientId) {
      // Send to specific patient
      const patient = await User.findById(recipientId).select('name email phone');
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Patient not found' });
      }
      recipients = [patient];
    } else {
      // Send to all patients
      recipients = await User.find({ role: 'patient', isActive: true }).select('name email phone');
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No active patients found' });
    }

    // Publish events for each recipient
    const events = [];
    for (const patient of recipients) {
      const eventData = {
        patientId: patient._id.toString(),
        patientEmail: patient.email,
        patientPhone: patient.phone,
        patientName: patient.name,
        subject,
        message,
        sendEmail,
        sendSMS,
        adminId: req.user._id.toString(),
      };

      await publishNotificationEvent('ADMIN_NOTIFICATION', eventData);
      events.push(eventData);
    }

    res.status(200).json({
      success: true,
      message: `Notification queued for ${recipients.length} patient(s)`,
      count: recipients.length
    });
  } catch (error) {
    console.error('Send Notification Error:', error);
    res.status(500).json({ success: false, message: 'Failed to send notification' });
  }
};

/**
 * @desc    Get admin notification history
 * @route   GET /api/patients/admin/notifications
 * @access  Private (Admin Only)
 */
exports.getNotifications = async (req, res) => {
  try {
    // For demonstration, return mock data
    // In production, you'd have an AdminNotificationLog model or call notification-service
    const mockNotifications = [
      {
        _id: '1',
        subject: 'System Maintenance Notice',
        message: 'The platform will undergo maintenance on Sunday from 2-4 AM.',
        recipientId: null, // All patients
        sentAt: new Date(Date.now() - 86400000), // 1 day ago
        status: 'SENT'
      },
      {
        _id: '2',
        subject: 'New Features Available',
        message: 'We\'ve added telemedicine features. Check them out in your dashboard!',
        recipientId: null, // All patients
        sentAt: new Date(Date.now() - 172800000), // 2 days ago
        status: 'SENT'
      }
    ];

    res.status(200).json({
      success: true,
      notifications: mockNotifications
    });
  } catch (error) {
    console.error('Get Notifications Error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
};