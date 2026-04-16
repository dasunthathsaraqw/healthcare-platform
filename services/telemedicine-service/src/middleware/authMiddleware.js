// src/middleware/authMiddleware.js
// ─────────────────────────────────────────────────────────────────────────────
// JWT Authentication & Role Guard — Placeholder-ready
//
// CURRENT STATE: Supports two modes:
//   1. BYPASS_AUTH=true   — skips all auth, injects a configurable mock user.
//                           Use during local development before auth is wired.
//   2. Normal mode        — verifies a real Bearer JWT signed with JWT_SECRET.
//                           Identical logic to the other services in this platform.
//
// HOW TO CONNECT TO THE REAL AUTH SYSTEM (2 steps):
//   1. Remove BYPASS_AUTH=true from .env (or set it to false).
//   2. Ensure JWT_SECRET in .env matches the secret used by patient-service
//      and doctor-service. The API gateway passes the original JWT unchanged,
//      so token verification will work automatically.
//
// WHAT CHANGES ONCE JWT IS FULLY WIRED:
//   • Nothing in controllers or routes needs to change — req.user.id/role
//     will be populated exactly the same way.
//   • Remove or archive this comment block.
//   • Optionally delete the BYPASS_AUTH branch.
// ─────────────────────────────────────────────────────────────────────────────

"use strict";

const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your-super-secret-jwt-key-change-this";

// ── Mock user defaults (only used when BYPASS_AUTH=true) ──────────────────────
// Override these via env vars during local testing to simulate different roles.
const MOCK_USER = {
  id:     process.env.MOCK_USER_ID   || "mock-patient-001",
  role:   process.env.MOCK_USER_ROLE || "patient",   // "patient" | "doctor" | "admin"
  email:  process.env.MOCK_USER_EMAIL || "mock@example.com",
  name:   process.env.MOCK_USER_NAME  || "Mock User",
};

const buildUserFromDecodedToken = (decoded) => ({
  id:     decoded.userId || decoded.id || decoded._id,
  userId: decoded.userId || decoded.id || decoded._id,
  role:   decoded.role   || "patient",
  email:  decoded.email  || "",
  name:   decoded.name   || "",
});

// ─────────────────────────────────────────────────────────────────────────────
// authenticate — verifies Bearer JWT or injects mock user
// ─────────────────────────────────────────────────────────────────────────────
const authenticate = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    // Service-to-service: accept INTERNAL_SECRET as a bearer token
    const internalSecret = process.env.INTERNAL_SECRET;
    if (internalSecret && token === internalSecret) {
      req.user = { id: "system", role: "admin", name: "Internal Service" };
      return next();
    }

    // ── BYPASS MODE (dev/testing only) ────────────────────────────────────────
    if (process.env.BYPASS_AUTH === "true") {
      // Even in BYPASS mode, prefer the real JWT if provided so doctor/patient
      // identities remain distinct during local multi-user testing.
      if (token) {
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          req.user = buildUserFromDecodedToken(decoded);
          return next();
        } catch (_err) {
          // Fall back to mock user in BYPASS mode when token is invalid.
        }
      }

      console.warn(
        `⚠️  [AuthMiddleware] BYPASS_AUTH is ON — using mock user: ` +
        `${MOCK_USER.role}/${MOCK_USER.id}`
      );
      req.user = { ...MOCK_USER };
      return next();
    }

    // ── REAL JWT VERIFICATION ─────────────────────────────────────────────────
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required. No token provided.",
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
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

    // Normalise: patient-service uses userId; doctor-service uses id
    req.user = buildUserFromDecodedToken(decoded);

    next();
  } catch (error) {
    console.error("[AuthMiddleware] Unexpected error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Authentication error.",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// authorize — role guard, always used AFTER authenticate
//
// Usage:  router.patch("/end", authenticate, authorize("doctor","admin"), handler)
// ─────────────────────────────────────────────────────────────────────────────
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Authentication required." });
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
