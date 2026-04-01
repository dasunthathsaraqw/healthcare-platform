// src/controllers/adminController.js
const User = require('../models/User');

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