const { HTTP_STATUS } = require("../utils/constants");

/**
 * Validation middleware wrapper
 * @param {Function} validationFunction - Validation function to run
 */
const validate = (validationFunction) => {
  return (req, res, next) => {
    const data = req.body;
    const { isValid, errors } = validationFunction(data);

    if (!isValid) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        success: false,
        errors: errors,
      });
    }

    next();
  };
};

/**
 * Sanitize input data
 * @param {Object} data - Input data to sanitize
 * @returns {Object} Sanitized data
 */
const sanitizeInput = (data) => {
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    if (typeof value === "string") {
      // Trim whitespace
      sanitized[key] = value.trim();
      // Remove potential script tags
      sanitized[key] = sanitized[key].replace(
        /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
        "",
      );
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
};

module.exports = {
  validate,
  sanitizeInput,
};
