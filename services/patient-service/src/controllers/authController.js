const User = require("../models/User");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { ROLES } = require("../constants/roles");

// ─── Constants ────────────────────────────────────────────────────────────────
const BCRYPT_SALT_ROUNDS = 12; // NIST-recommended minimum for 2024

// ─── Helpers ─────────────────────────────────────────────────────────────────

const generateToken = (userId, userRole) =>
  jwt.sign(
    { userId: userId.toString(), role: userRole },
    process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
    { expiresIn: "7d" }
  );

/**
 * Standard error response factory.
 * Keeps all error shapes consistent for the frontend.
 */
const errorResponse = (res, statusCode, message, extra = {}) =>
  res.status(statusCode).json({ success: false, code: statusCode, message, ...extra });

// ─────────────────────────────────────────────────────────────────────────────
// REGISTER
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────

exports.register = async (req, res) => {
  try {
    const { name, email, password, role, phone } = req.body;
    const ADMIN_BOOTSTRAP_EMAIL = (
      process.env.ADMIN_BOOTSTRAP_EMAIL || "admin@system.com"
    ).toLowerCase();

    const lowerCaseEmail = email.toLowerCase();

    // Duplicate check
    const existingUser = await User.findOne({ email: lowerCaseEmail });
    if (existingUser) {
      return errorResponse(res, 409, "An account with this email already exists.");
    }

    // Hash password with hardened cost factor
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);

    // Role assignment
    let assignedRole = ROLES.PATIENT;
    if (role === ROLES.ADMIN || lowerCaseEmail === ADMIN_BOOTSTRAP_EMAIL) {
      assignedRole = ROLES.ADMIN;
    } else if (role === ROLES.DOCTOR) {
      assignedRole = ROLES.DOCTOR;
    }

    const user = new User({
      name: name.trim(),
      email: lowerCaseEmail,
      password: hashedPassword,
      role: assignedRole,
      phone: phone?.trim() || "",
      isVerified: assignedRole === ROLES.DOCTOR ? false : true,
    });

    await user.save();
    console.log(`✅ New ${assignedRole} registered: ${lowerCaseEmail}`);

    const token = generateToken(user._id, user.role);

    return res.status(201).json({
      success: true,
      message: "Account created successfully. Welcome to Smart Healthcare!",
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    // Mongoose duplicate key race condition (concurrent registrations)
    if (error.code === 11000) {
      return errorResponse(res, 409, "An account with this email already exists.");
    }
    console.error("❌ Registration error:", error);
    return errorResponse(res, 500, "Registration failed. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN
// POST /api/auth/login
// Rate-limited at the route level (see authRoutes.js)
// ─────────────────────────────────────────────────────────────────────────────

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user — same vague error message for both "not found" and "wrong password"
    // to prevent user enumeration attacks
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return errorResponse(res, 401, "Invalid email or password.");
    }

    if (!user.isActive) {
      return errorResponse(
        res, 403,
        "Your account has been deactivated. Please contact support."
      );
    }

    // Constant-time password comparison (bcrypt prevents timing attacks)
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return errorResponse(res, 401, "Invalid email or password.");
    }

    const token = generateToken(user._id, user.role);
    console.log(`✅ Login successful: ${user.email} [${user.role}]`);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: user.getPublicProfile(),
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    return errorResponse(res, 500, "Login failed. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CURRENT USER
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────────────────────

exports.getCurrentUser = async (req, res) => {
  try {
    let userProfile;
    
    // If req.user is a plain object (due to DB bypass in auth middleware for admins/doctors)
    if (typeof req.user.getPublicProfile !== "function") {
      const fullUser = await User.findById(req.user._id);
      if (!fullUser) {
        return errorResponse(res, 404, "User account not found.");
      }
      userProfile = fullUser.getPublicProfile();
    } else {
      userProfile = req.user.getPublicProfile();
    }

    return res.status(200).json({
      success: true,
      user: userProfile,
    });
  } catch (error) {
    console.error("❌ getCurrentUser error:", error);
    return errorResponse(res, 500, "Failed to retrieve user profile.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANGE PASSWORD
// PUT /api/auth/change-password
// ─────────────────────────────────────────────────────────────────────────────

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Fetch fresh document (req.user may not have the hashed password field)
    const freshUser = await User.findById(req.user._id);
    if (!freshUser) {
      return errorResponse(res, 404, "User account not found.");
    }

    const isValidPassword = await freshUser.comparePassword(currentPassword);
    if (!isValidPassword) {
      return errorResponse(res, 400, "Current password is incorrect.");
    }

    // Hash and save
    freshUser.password = await bcrypt.hash(newPassword, BCRYPT_SALT_ROUNDS);
    await freshUser.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    console.error("❌ changePassword error:", error);
    return errorResponse(res, 500, "Failed to change password. Please try again.");
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// UPDATE PROFILE
// PUT /api/auth/profile
// ─────────────────────────────────────────────────────────────────────────────

exports.updateProfile = async (req, res) => {
  try {
    const allowedUpdates = ["name", "phone", "address", "dateOfBirth"];
    const updates = {};

    allowedUpdates.forEach((field) => {
      if (req.body[field] !== undefined) {
        // Trim string values to prevent whitespace-only storage
        updates[field] =
          typeof req.body[field] === "string"
            ? req.body[field].trim()
            : req.body[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, "No valid fields provided to update.");
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      return errorResponse(res, 404, "User account not found.");
    }

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      user: updatedUser.getPublicProfile(),
    });
  } catch (error) {
    console.error("❌ updateProfile error:", error);
    // Mongoose validation errors (e.g., minlength)
    if (error.name === "ValidationError") {
      const msg = Object.values(error.errors)[0]?.message || "Validation failed";
      return errorResponse(res, 400, msg);
    }
    return errorResponse(res, 500, "Failed to update profile. Please try again.");
  }
};