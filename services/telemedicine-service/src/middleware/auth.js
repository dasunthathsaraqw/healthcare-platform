// src/middleware/auth.js
// Stateless JWT middleware for the telemedicine-service.
// Mirrors the appointment-service auth pattern exactly:
//   • No DB lookup — token is verified cryptographically only.
//   • Supports service-to-service calls via INTERNAL_SECRET.
//   • Normalises decoded payload to { id, userId, role, email, name }.

const jwt = require("jsonwebtoken");

/**
 * authenticate — verifies the Bearer token in Authorization header.
 * Attaches req.user = { id, userId, role, email, name } on success.
 */
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];
    const secret =
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";
    const internalSecret = process.env.INTERNAL_SECRET;

    // ── Service-to-service authentication ────────────────────────────────────
    if (internalSecret && token === internalSecret) {
      req.user = { id: "system", role: "admin", name: "Internal Service" };
      return next();
    }

    // ── User JWT verification ─────────────────────────────────────────────────
    let decoded;
    try {
      decoded = jwt.verify(token, secret);
    } catch (err) {
      console.warn("❌ Auth failed:", err.message);
      if (err.name === "TokenExpiredError") {
        return res.status(401).json({
          success: false,
          message: "Session expired. Please login again.",
        });
      }
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    // Normalise: patient-service uses userId, doctor-service uses id
    req.user = {
      id: decoded.userId || decoded.id || decoded._id,
      userId: decoded.userId || decoded.id || decoded._id,
      role: decoded.role || "patient",
      email: decoded.email || "",
      name: decoded.name || "",
    };

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

/**
 * authorize — role guard, use after authenticate.
 * Example: router.get("/...", authenticate, authorize("doctor", "admin"), handler)
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res
        .status(401)
        .json({ success: false, message: "Authentication required" });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role: ${roles.join(" or ")}.`,
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };
