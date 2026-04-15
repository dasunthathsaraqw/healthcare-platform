const jwt = require("jsonwebtoken");

/**
 * Stateless JWT middleware for the appointment-service.
 * The appointment-service has no user DB of its own, so we simply
 * decode and verify the token rather than doing a DB lookup.
 * The decoded payload (userId, role, email) is attached to req.user.
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
    const secret = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";
    const internalSecret = process.env.INTERNAL_SECRET;

    // Service-to-service authentication (e.g. from payment-service)
    if (internalSecret && token === internalSecret) {
      req.user = { id: "system", role: "admin", name: "Internal Service" };
      return next();
    }

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

    // Normalise: patient-service puts id in userId; doctor-service puts id in id
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
 * Optional role guard — use after authenticate.
 * Example: authorize("doctor", "admin")
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required" });
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
