const {
  HTTP_STATUS,
  RESPONSE_MESSAGES,
  ROLE_HIERARCHY,
} = require("../utils/constants");

/**
 * Role-based access control middleware
 * @param {...string} allowedRoles - List of roles allowed to access the route
 */
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED,
      });
    }

    // Check if user's role is allowed
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }

    // If specific roles not matched, check permission level
    const userRoleLevel = ROLE_HIERARCHY[req.user.role];
    const highestAllowedLevel = Math.max(
      ...allowedRoles.map((role) => ROLE_HIERARCHY[role]),
    );

    if (userRoleLevel >= highestAllowedLevel) {
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: RESPONSE_MESSAGES.FORBIDDEN,
    });
  };
};

/**
 * Permission-based access control middleware
 * @param {...string} requiredPermissions - List of permissions required
 */
const hasPermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message: RESPONSE_MESSAGES.UNAUTHORIZED,
      });
    }

    // Admin has all permissions
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user has required permissions
    // This would require loading user permissions from database
    // For now, we'll use role-based check
    const userPermissions = getPermissionsByRole(req.user.role);

    const hasAllPermissions = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );

    if (hasAllPermissions) {
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: RESPONSE_MESSAGES.FORBIDDEN,
    });
  };
};

/**
 * Get permissions for a role
 * @param {string} role - User role
 * @returns {Array} List of permissions
 */
const getPermissionsByRole = (role) => {
  const { ROLE_PERMISSIONS } = require("../utils/constants");
  return ROLE_PERMISSIONS[role] || [];
};

/**
 * Check if user is accessing their own resource
 * @param {string} paramIdField - Field name in params that contains user ID
 */
const isOwnResource = (paramIdField = "id") => {
  return (req, res, next) => {
    const resourceId = req.params[paramIdField];

    // Admin can access any resource
    if (req.user.role === "admin") {
      return next();
    }

    // Check if user is accessing their own data
    if (req.user._id.toString() === resourceId || req.user.id === resourceId) {
      return next();
    }

    return res.status(HTTP_STATUS.FORBIDDEN).json({
      success: false,
      message: "You can only access your own resources",
    });
  };
};

module.exports = {
  authorize,
  hasPermission,
  isOwnResource,
};
