// Role constants - easy to extend in the future
const ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

// Role hierarchy for permission checking
const ROLE_HIERARCHY = {
  [ROLES.PATIENT]: 1,
  [ROLES.DOCTOR]: 2,
  [ROLES.ADMIN]: 3,
};

// Role-based permissions
const PERMISSIONS = {
  [ROLES.PATIENT]: [
    "view_doctors",
    "book_appointments",
    "view_own_appointments",
    "upload_reports",
    "view_own_prescriptions",
    "edit_own_profile",
  ],
  [ROLES.DOCTOR]: [
    "view_patients",
    "manage_availability",
    "view_assigned_appointments",
    "issue_prescriptions",
    "view_patient_reports",
    "edit_own_profile",
  ],
  [ROLES.ADMIN]: [
    "manage_all_users",
    "verify_doctors",
    "view_all_transactions",
    "manage_platform_settings",
    "view_all_appointments",
    "manage_all_roles",
  ],
};

module.exports = { ROLES, ROLE_HIERARCHY, PERMISSIONS };
