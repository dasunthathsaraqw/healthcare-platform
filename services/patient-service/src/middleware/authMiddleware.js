const { verifyToken } = require("../utils/jwt");
const User = require("../models/User");
const { HTTP_STATUS, RESPONSE_MESSAGES } = require("../utils/constants");

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request object
 */
const authenticate = async (req, res, next) => {
  try {
    // Get token from header
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.MISSING_TOKEN,
      });
    }

    // Verify token
    const decoded = verifyToken(token);

    // Find user
    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.USER_NOT_FOUND,
      });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.ACCOUNT_DISABLED,
      });
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return res.status(HTTP_STATUS.UNAUTHORIZED).json({
      success: false,
      message: error.message || RESPONSE_MESSAGES.INVALID_TOKEN,
    });
  }
};

module.exports = { authenticate };
