/**
 * Application-wide constants
 * Centralized for easy maintenance and future extensions
 */

// User Roles - Defined as constants for type safety
const USER_ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
  // Future roles can be added here easily
  // RECEPTIONIST: 'receptionist',
  // PHARMACIST: 'pharmacist',
  // LAB_TECH: 'lab_tech'
};

// Role hierarchy for permission inheritance (higher number = more permissions)
const ROLE_HIERARCHY = {
  [USER_ROLES.PATIENT]: 1,
  [USER_ROLES.DOCTOR]: 2,
  [USER_ROLES.ADMIN]: 3,
};

// Role-based permissions mapping
const ROLE_PERMISSIONS = {
  [USER_ROLES.PATIENT]: [
    "view_doctors",
    "book_appointment",
    "cancel_appointment",
    "view_own_appointments",
    "upload_medical_reports",
    "view_own_prescriptions",
    "update_own_profile",
    "view_own_medical_history",
  ],
  [USER_ROLES.DOCTOR]: [
    "view_patients",
    "manage_availability",
    "view_assigned_appointments",
    "accept_appointment",
    "reject_appointment",
    "issue_prescription",
    "view_patient_reports",
    "update_own_profile",
  ],
  [USER_ROLES.ADMIN]: [
    "manage_all_users",
    "verify_doctors",
    "view_all_appointments",
    "view_all_transactions",
    "manage_platform_settings",
    "view_analytics",
    "manage_roles",
  ],
};

// API Response Messages
const RESPONSE_MESSAGES = {
  // Success Messages
  LOGIN_SUCCESS: "Login successful",
  REGISTER_SUCCESS: "Registration successful",
  LOGOUT_SUCCESS: "Logout successful",
  PROFILE_UPDATED: "Profile updated successfully",
  PASSWORD_CHANGED: "Password changed successfully",

  // Error Messages
  USER_NOT_FOUND: "User not found",
  INVALID_CREDENTIALS: "Invalid email or password",
  EMAIL_EXISTS: "Email already registered",
  UNAUTHORIZED: "Unauthorized access",
  FORBIDDEN: "You do not have permission to perform this action",
  INVALID_TOKEN: "Invalid or expired token",
  MISSING_TOKEN: "Authentication token is required",
  ACCOUNT_DISABLED: "Account is disabled. Please contact admin",
  DOCTOR_NOT_VERIFIED:
    "Doctor account not verified yet. Please wait for admin approval",
};

// HTTP Status Codes
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
};

// Token expiration times (in seconds)
const TOKEN_EXPIRY = {
  ACCESS_TOKEN: "7d", // 7 days
  REFRESH_TOKEN: "30d", // 30 days
};

module.exports = {
  USER_ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  RESPONSE_MESSAGES,
  HTTP_STATUS,
  TOKEN_EXPIRY,
};
