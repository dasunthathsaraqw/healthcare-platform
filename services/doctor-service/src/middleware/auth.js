const jwt = require("jsonwebtoken");
const Doctor = require("../models/Doctor");

/**
 * Middleware: verify JWT token and ensure the role is 'doctor'
 * Attaches the doctor document to req.doctor
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "No token provided. Access denied.",
      });
    }

    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({
        success: false,
        message: "Invalid or expired token.",
      });
    }

    if (decoded.role !== "doctor") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Doctor role required.",
      });
    }

    const doctor = await Doctor.findById(decoded.id).select("-password");
    if (!doctor) {
      return res.status(401).json({
        success: false,
        message: "Doctor account not found.",
      });
    }

    if (!doctor.isActive) {
      return res.status(403).json({
        success: false,
        message: "Your account has been deactivated.",
      });
    }

    req.doctor = doctor;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

module.exports = { authenticate };
