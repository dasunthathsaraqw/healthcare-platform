const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const authController = require("../controllers/authController");
const { authenticate, authorize, ROLES } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
  handleValidationErrors,
} = require("../middleware/validate");

// ─── Rate Limiters ────────────────────────────────────────────────────────────

/**
 * Brute-force protection on the login endpoint.
 * 10 attempts per IP per 15-minute window — then locked out temporarily.
 */
const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,  // Return RateLimit-* headers
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    message:
      "Too many login attempts from this IP. Please wait 15 minutes and try again.",
  },
  skipSuccessfulRequests: true, // Don't count successful logins against the limit
});

/**
 * Lighter limiter on registration to prevent account spam.
 */
const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    code: 429,
    message: "Too many registration attempts from this IP. Please try again later.",
  },
});

// ─── Public Routes ────────────────────────────────────────────────────────────

router.post(
  "/register",
  registerRateLimiter,
  validateRegister,
  handleValidationErrors,
  authController.register
);

router.post(
  "/login",
  loginRateLimiter,
  validateLogin,
  handleValidationErrors,
  authController.login
);

// ─── Protected Routes ─────────────────────────────────────────────────────────

router.get("/me", authenticate, authController.getCurrentUser);

router.put(
  "/change-password",
  authenticate,
  validateChangePassword,
  handleValidationErrors,
  authController.changePassword
);

router.put(
  "/profile",
  authenticate,
  validateProfileUpdate,
  handleValidationErrors,
  authController.updateProfile
);

// ─── Admin-only Test Route ────────────────────────────────────────────────────

router.get(
  "/admin-only",
  authenticate,
  authorize(ROLES.ADMIN),
  (req, res) => res.json({ success: true, message: "Admin access granted" })
);

module.exports = router;
