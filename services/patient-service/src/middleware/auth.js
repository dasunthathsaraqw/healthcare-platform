const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { ROLES, ROLE_HIERARCHY } = require("../constants/roles");

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
    );

    // Bypass DB check for service-to-service calls (e.g., Doctor fetching patient details)
    if (decoded.role === "doctor" || decoded.role === "admin") {
      req.user = { _id: decoded.userId || decoded.id, role: decoded.role };
      return next();
    }

    const user = await User.findById(decoded.userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User not found. Please login again.",
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: "Your account has been deactivated. Please contact admin.",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// JWT-ONLY AUTH (no DB lookup)
// Use this for cross-service endpoints where the caller's account lives in a
// different service's database (e.g., doctors calling patient-service endpoints).
// The role is trusted from the signed JWT payload itself.
// ─────────────────────────────────────────────────────────────────────────────
const authenticateJwtOnly = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
      });
    }

    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this",
    );

    // Build a minimal req.user from token claims — no DB query needed
    req.user = {
      _id: decoded.userId,
      id: decoded.userId,
      role: decoded.role,
    };

    next();
  } catch (error) {
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
    }
    return res.status(500).json({
      success: false,
      message: "Authentication error",
      error: error.message,
    });
  }
};

// Role-based access control
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    console.log(`🔐 Authorize: user=${req.user?.email}, role=${req.user?.role}, allowed=${allowedRoles}`);
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. ${allowedRoles.join(" or ")} role(s) required.`,
      });
    }

    next();
  };
};

// Permission-based access control
const hasPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!req.user.hasPermission(permission)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. You need '${permission}' permission.`,
      });
    }

    next();
  };
};

// Check if user can access resource (e.g., user can only access their own data)
const canAccessResource = (resourceUserIdField = "userId") => {
  return (req, res, next) => {
    const resourceUserId =
      req.params[resourceUserIdField] || req.body[resourceUserIdField];

    // Admin can access everything
    if (req.user.role === ROLES.ADMIN) {
      return next();
    }

    // Users can only access their own resources
    if (resourceUserId && resourceUserId !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only access your own resources.",
      });
    }

    next();
  };
};

module.exports = {
  authenticate,
  authenticateJwtOnly,
  authorize,
  hasPermission,
  canAccessResource,
  ROLES,
};
