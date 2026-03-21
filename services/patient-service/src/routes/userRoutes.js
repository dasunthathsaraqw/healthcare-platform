const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/authMiddleware");
const { authorize, isOwnResource } = require("../middleware/roleMiddleware");
const { USER_ROLES } = require("../utils/constants");

// Import user controller (to be implemented)
const userController = {
  updateProfile: async (req, res) => {
    res.json({ message: "Update profile - to be implemented" });
  },
  changePassword: async (req, res) => {
    res.json({ message: "Change password - to be implemented" });
  },
  deleteAccount: async (req, res) => {
    res.json({ message: "Delete account - to be implemented" });
  },
};

/**
 * @route   PUT /api/users/profile
 * @desc    Update user profile
 * @access  Private
 */
router.put("/profile", authenticate, userController.updateProfile);

/**
 * @route   POST /api/users/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post("/change-password", authenticate, userController.changePassword);

/**
 * @route   DELETE /api/users/:id
 * @desc    Delete user account
 * @access  Private (Admin or own account)
 */
router.delete(
  "/:id",
  authenticate,
  isOwnResource("id"),
  authorize(USER_ROLES.ADMIN, USER_ROLES.PATIENT, USER_ROLES.DOCTOR),
  userController.deleteAccount,
);

module.exports = router;
