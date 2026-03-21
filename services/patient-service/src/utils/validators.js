const { USER_ROLES } = require("./constants");

/**
 * Validation rules for different operations
 */

// Registration validation rules
const registerValidation = (data) => {
  const errors = [];

  // Name validation
  if (!data.name || data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  // Email validation
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push("Please provide a valid email address");
  }

  // Password validation
  if (!data.password || data.password.length < 6) {
    errors.push("Password must be at least 6 characters long");
  }

  // Password strength check
  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
  if (data.password && !strongPasswordRegex.test(data.password)) {
    errors.push(
      "Password must contain at least one uppercase letter, one lowercase letter, and one number",
    );
  }

  // Role validation
  const validRoles = Object.values(USER_ROLES);
  if (!data.role || !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(", ")}`);
  }

  // Phone validation (optional)
  if (data.phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push("Please provide a valid phone number");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Login validation rules
const loginValidation = (data) => {
  const errors = [];

  // Email validation
  const emailRegex = /^[^\s@]+@([^\s@]+\.)+[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email)) {
    errors.push("Please provide a valid email address");
  }

  // Password validation
  if (!data.password || data.password.length < 1) {
    errors.push("Password is required");
  }

  // Role validation
  const validRoles = Object.values(USER_ROLES);
  if (data.role && !validRoles.includes(data.role)) {
    errors.push(`Role must be one of: ${validRoles.join(", ")}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Profile update validation
const profileUpdateValidation = (data) => {
  const errors = [];

  if (data.name && data.name.trim().length < 2) {
    errors.push("Name must be at least 2 characters long");
  }

  if (data.phone) {
    const phoneRegex = /^[0-9+\-\s()]{10,15}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push("Please provide a valid phone number");
    }
  }

  if (data.dateOfBirth) {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(data.dateOfBirth)) {
      errors.push("Date of birth must be in YYYY-MM-DD format");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// Password change validation
const passwordChangeValidation = (data) => {
  const errors = [];

  if (!data.currentPassword) {
    errors.push("Current password is required");
  }

  if (!data.newPassword || data.newPassword.length < 6) {
    errors.push("New password must be at least 6 characters long");
  }

  if (data.newPassword !== data.confirmPassword) {
    errors.push("New password and confirm password do not match");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

module.exports = {
  registerValidation,
  loginValidation,
  profileUpdateValidation,
  passwordChangeValidation,
};
