const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate, authorize, ROLES } = require("../middleware/auth");
const {
  validateRegister,
  validateLogin,
  handleValidationErrors,
} = require("../middleware/validate");

// Public routes (no authentication required)
router.post(
  "/register",
  validateRegister,
  handleValidationErrors,
  authController.register,
);
router.post(
  "/login",
  validateLogin,
  handleValidationErrors,
  authController.login,
);

// Protected routes (authentication required)
router.get("/me", authenticate, authController.getCurrentUser);
router.put("/change-password", authenticate, authController.changePassword);
router.put("/profile", authenticate, authController.updateProfile);

// Example of role-protected route (only admin)
router.get("/admin-only", authenticate, authorize(ROLES.ADMIN), (req, res) => {
  res.json({ message: "Admin access granted" });
});

module.exports = router;
