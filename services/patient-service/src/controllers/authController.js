const User = require("../models/User");
const Patient = require("../models/Patient");
const Doctor = require("../models/Doctor");
const { generateToken } = require("../utils/jwt");
const {
  USER_ROLES,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
} = require("../utils/constants");
const { registerValidation, loginValidation } = require("../utils/validators");
const { sanitizeInput } = require("../middleware/validationMiddleware");

/**
 * Register a new user (Patient or Doctor)
 */
const register = async (req, res) => {
  try {
    // Sanitize input
    const sanitizedData = sanitizeInput(req.body);

    // Validate input
    const { isValid, errors } = registerValidation(sanitizedData);
    if (!isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errors: errors,
      });
    }

    const { name, email, password, role, phone, ...additionalData } =
      sanitizedData;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(HTTP_STATUS.CONFLICT).json({
        success: false,
        message: RESPONSE_MESSAGES.EMAIL_EXISTS,
      });
    }

    let user;

    // Create user based on role
    if (role === USER_ROLES.PATIENT) {
      user = await Patient.create({
        name,
        email,
        password,
        role: USER_ROLES.PATIENT,
        phone,
        ...additionalData,
      });
    } else if (role === USER_ROLES.DOCTOR) {
      // Validate doctor-specific fields
      if (
        !additionalData.specialty ||
        !additionalData.licenseNumber ||
        !additionalData.consultationFee
      ) {
        return res.status(HTTP_STATUS.BAD_REQUEST).json({
          success: false,
          message:
            "Specialty, license number, and consultation fee are required for doctors",
        });
      }

      user = await Doctor.create({
        name,
        email,
        password,
        role: USER_ROLES.DOCTOR,
        phone,
        specialty: additionalData.specialty,
        licenseNumber: additionalData.licenseNumber,
        consultationFee: additionalData.consultationFee,
        qualifications: additionalData.qualifications || [],
        experience: additionalData.experience || 0,
        ...additionalData,
      });
    } else {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        message: "Invalid role specified",
      });
    }

    // Generate token
    const token = generateToken(user);

    // Return user data (without password) and token
    const userResponse = user.toJSON();

    return res.status(HTTP_STATUS.CREATED).json({
      success: true,
      message: RESPONSE_MESSAGES.REGISTER_SUCCESS,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error("Registration error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Registration failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    // Sanitize input
    const sanitizedData = sanitizeInput(req.body);

    // Validate input
    const { isValid, errors } = loginValidation(sanitizedData);
    if (!isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errors: errors,
      });
    }

    const { email, password, role } = sanitizedData;

    // Find user with password field
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Check if role matches (if provided)
    if (role && user.role !== role) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: `Invalid credentials for ${role} account`,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ACCOUNT_DISABLED,
      });
    }

    // Check if doctor is verified
    if (user.role === USER_ROLES.DOCTOR && !user.isVerified) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.DOCTOR_NOT_VERIFIED,
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.INVALID_CREDENTIALS,
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate token
    const token = generateToken(user);

    // Get user data without password
    const userResponse = user.toJSON();

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.LOGIN_SUCCESS,
      data: {
        user: userResponse,
        token,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Login failed. Please try again.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
};

/**
 * Get current authenticated user profile
 */
const getCurrentUser = async (req, res) => {
  try {
    const user = req.user;

    // If doctor, get full doctor details
    if (user.role === USER_ROLES.DOCTOR) {
      const doctor = await Doctor.findById(user._id);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user: doctor.toJSON() },
      });
    }

    // If patient, get full patient details
    if (user.role === USER_ROLES.PATIENT) {
      const patient = await Patient.findById(user._id);
      return res.status(HTTP_STATUS.OK).json({
        success: true,
        data: { user: patient.toJSON() },
      });
    }

    return res.status(HTTP_STATUS.OK).json({
      success: true,
      data: { user: user.toJSON() },
    });
  } catch (error) {
    console.error("Get current user error:", error);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Failed to get user profile",
    });
  }
};

/**
 * Logout user (client-side token removal)
 */
const logout = async (req, res) => {
  try {
    // Since JWT is stateless, we just return success
    // Client should remove the token from storage
    return res.status(HTTP_STATUS.OK).json({
      success: true,
      message: RESPONSE_MESSAGES.LOGOUT_SUCCESS,
    });
  } catch (error) {
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      message: "Logout failed",
    });
  }
};

module.exports = {
  register,
  login,
  getCurrentUser,
  logout,
};
