// Constants for user roles - matching backend
export const USER_ROLES = {
  PATIENT: "patient",
  DOCTOR: "doctor",
  ADMIN: "admin",
};

// Role-based routes access
export const ROLE_ROUTES = {
  [USER_ROLES.PATIENT]: ["/dashboard", "/doctors", "/appointments", "/reports"],
  [USER_ROLES.DOCTOR]: [
    "/doctor/dashboard",
    "/doctor/appointments",
    "/doctor/patients",
  ],
  [USER_ROLES.ADMIN]: ["/admin/dashboard", "/admin/users", "/admin/doctors"],
};

// Role-based navigation items
export const NAV_ITEMS = {
  [USER_ROLES.PATIENT]: [
    { name: "Dashboard", href: "/dashboard", icon: "🏠" },
    { name: "Find Doctors", href: "/doctors", icon: "👨‍⚕️" },
    { name: "My Appointments", href: "/appointments", icon: "📅" },
    { name: "Medical Reports", href: "/reports", icon: "📋" },
    { name: "Profile", href: "/profile", icon: "👤" },
  ],
  [USER_ROLES.DOCTOR]: [
    { name: "Dashboard", href: "/doctor/dashboard", icon: "🏠" },
    { name: "Appointments", href: "/doctor/appointments", icon: "📅" },
    { name: "My Patients", href: "/doctor/patients", icon: "👥" },
    { name: "Availability", href: "/doctor/availability", icon: "⏰" },
    { name: "Profile", href: "/doctor/profile", icon: "👤" },
  ],
  [USER_ROLES.ADMIN]: [
    { name: "Dashboard", href: "/admin/dashboard", icon: "🏠" },
    { name: "Users", href: "/admin/users", icon: "👥" },
    { name: "Doctors", href: "/admin/doctors", icon: "👨‍⚕️" },
    { name: "Transactions", href: "/admin/transactions", icon: "💰" },
    { name: "Settings", href: "/admin/settings", icon: "⚙️" },
  ],
};
