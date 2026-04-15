const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");

/**
 * POST /api/doctors/register
 * Register a new doctor (pending admin verification)
 */
const doctorRegister = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      specialty,
      qualifications,
      experience,
      consultationFee,
    } = req.body;

    // Validate required fields
    if (!name || !email || !password || !specialty) {
      return res.status(400).json({
        success: false,
        message: "name, email, password and specialty are required",
      });
    }

    // Check for existing doctor
    const existing = await Doctor.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({
        success: false,
        message: "A doctor with this email already exists",
      });
    }

    const doctor = new Doctor({
      name,
      email,
      password,
      phone,
      specialty,
      qualifications: qualifications || [],
      experience: experience || 0,
      consultationFee: consultationFee || 0,
      isVerified: false, // requires admin approval
    });

    await doctor.save();

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Your account is pending admin verification.",
      doctorId: doctor._id,
    });
  } catch (error) {
    console.error("doctorRegister error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/**
 * POST /api/doctors/login
 * Authenticate a doctor and return a JWT
 */
const doctorLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const doctor = await Doctor.findOne({ email: email.toLowerCase() });
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await doctor.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (!doctor.isVerified) {
      return res.status(403).json({
        success: false,
        message:
          "Your account has not been verified yet. Please wait for admin approval.",
      });
    }

    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated. Contact support.",
      });
    }

    const token = jwt.sign(
      { id: doctor._id, role: "doctor" },
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
      { expiresIn: "7d" }
    );

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      doctor: doctor.getPublicProfile(),
    });
  } catch (error) {
    console.error("doctorLogin error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = { doctorRegister, doctorLogin };
