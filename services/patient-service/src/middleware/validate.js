const { body, param, validationResult } = require("express-validator");

// ─── Shared error handler ────────────────────────────────────────────────────
/**
 * Middleware: collect express-validator errors and return a standardised
 * { success: false, message, errors[] } response when validation fails.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstMessage = errors.array()[0].msg;
    return res.status(400).json({
      success: false,
      code: 400,
      message: firstMessage,
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ─── Registration ────────────────────────────────────────────────────────────
const validateRegister = [
  body("name")
    .trim()
    .notEmpty().withMessage("Full name is required")
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("Name can only contain letters, spaces, hyphens and apostrophes"),

  body("email")
    .trim()
    .notEmpty().withMessage("Email address is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage("Email address is too long"),

  body("password")
    .notEmpty().withMessage("Password is required")
    .isLength({ min: 8 }).withMessage("Password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("Password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("Password must contain at least one number"),

  body("role")
    .optional()
    .isIn(["patient", "doctor", "admin"]).withMessage("Role must be 'patient', 'doctor', or 'admin'"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone("any", { strictMode: false }).withMessage("Please provide a valid phone number"),
];

// ─── Login ─────────────────────────────────────────────────────────────────
const validateLogin = [
  body("email")
    .trim()
    .notEmpty().withMessage("Email address is required")
    .isEmail().withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty().withMessage("Password is required"),
];

// ─── Profile Update ──────────────────────────────────────────────────────────
const validateProfileUpdate = [
  body("name")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage("Name must be between 2 and 100 characters")
    .matches(/^[a-zA-Z\s'-]+$/).withMessage("Name can only contain letters, spaces, hyphens and apostrophes"),

  body("phone")
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone("any", { strictMode: false }).withMessage("Please provide a valid phone number"),

  body("dateOfBirth")
    .optional({ checkFalsy: true })
    .isISO8601().withMessage("Date of birth must be a valid date (YYYY-MM-DD)")
    .custom((value) => {
      const dob = new Date(value);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 120);
      if (dob < minAge) throw new Error("Date of birth is not realistic");
      if (dob > new Date()) throw new Error("Date of birth cannot be in the future");
      return true;
    }),

  body("address")
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 500 }).withMessage("Address cannot exceed 500 characters"),
];

// ─── Change Password ─────────────────────────────────────────────────────────
const validateChangePassword = [
  body("currentPassword")
    .notEmpty().withMessage("Current password is required"),

  body("newPassword")
    .notEmpty().withMessage("New password is required")
    .isLength({ min: 8 }).withMessage("New password must be at least 8 characters long")
    .matches(/[A-Z]/).withMessage("New password must contain at least one uppercase letter")
    .matches(/[0-9]/).withMessage("New password must contain at least one number")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error("New password must be different from current password");
      }
      return true;
    }),
];

// ─── Medical History ─────────────────────────────────────────────────────────
const validateMedicalHistory = [
  body("conditions")
    .isArray().withMessage("Conditions must be an array")
    .custom((arr) => {
      if (!arr.every((item) => typeof item === "string" && item.trim().length > 0)) {
        throw new Error("Each condition must be a non-empty string");
      }
      if (arr.length > 50) throw new Error("Cannot have more than 50 medical conditions");
      return true;
    }),
];

module.exports = {
  validateRegister,
  validateLogin,
  validateProfileUpdate,
  validateChangePassword,
  validateMedicalHistory,
  handleValidationErrors,
};
