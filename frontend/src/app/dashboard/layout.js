"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/services/api";

const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
        ),
      },
      {
        label: "My Appointments",
        href: "/dashboard/appointments",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: "Notifications",
        href: "/dashboard/notifications",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Consultations",
    items: [
      {
        label: "Telemedicine",
        href: "/dashboard/telemedicine",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
        ),
      },
      {
        label: "AI Checker",
        href: "/dashboard/ai-checker",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V7a2 2 0 012-2h2l2-2h2l2 2h2a2 2 0 012 2v12a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Health Records",
    items: [
      {
        label: "Medical Vault",
        href: "/dashboard/reports",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        label: "Prescriptions",
        href: "/dashboard/prescriptions",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        label: "Health Metrics",
        href: "/dashboard/metrics",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Settings",
    items: [
      {
        label: "My Profile",
        href: "/dashboard/profile",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
            />
          </svg>
        ),
      },
      {
        label: "Notification Preferences",
        href: "/dashboard/settings/notifications",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
        ),
      },
      {
        label: "Data & Privacy",
        href: "/dashboard/settings/privacy",
        patientOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        ),
      },
    ],
  },
  {
    heading: "Admin Controls",
    items: [
      {
        label: "Admin Profile",
        href: "/dashboard/admin/profile",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        label: "User Management",
        href: "/dashboard/admin",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
            />
          </svg>
        ),
      },
      {
        label: "Financial Oversight",
        href: "/dashboard/admin/finance",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        ),
      },
      {
        label: "Platform Logs",
        href: "/dashboard/admin/logs",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        ),
      },
      {
        label: "Send Notifications",
        href: "/dashboard/admin/notifications",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
            />
          </svg>
        ),
      },
    ],
  },
];

const BREADCRUMB_MAP = {
  "/dashboard": "Dashboard",
  "/dashboard/appointments": "My Appointments",
  "/dashboard/notifications": "Notifications",
  "/dashboard/telemedicine": "Telemedicine",
  "/dashboard/ai-checker": "AI Checker",
  "/dashboard/reports": "Medical Vault",
  "/dashboard/prescriptions": "Prescriptions",
  "/dashboard/metrics": "Health Metrics",
  "/dashboard/profile": "My Profile",
  "/dashboard/settings/notifications": "Notification Preferences",
  "/dashboard/settings/privacy": "Data & Privacy",
  "/dashboard/admin": "User Management",
  "/dashboard/admin/profile": "Admin Profile",
  "/dashboard/admin/finance": "Financial Oversight",
  "/dashboard/admin/logs": "Platform Logs",
  "/dashboard/admin/notifications": "Send Notifications",
};

const STATUS_STYLES = {
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
};

function getInitials(name = "") {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "PT"
  );
}

function truncateText(value = "", maxLength = 80) {
  if (value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function formatRelativeTime(value) {
  if (!value) return "";

  const date = new Date(value);
  const seconds = Math.round((date.getTime() - Date.now()) / 1000);
  const intervals = [
    { unit: "year", seconds: 31536000 },
    { unit: "month", seconds: 2592000 },
    { unit: "day", seconds: 86400 },
    { unit: "hour", seconds: 3600 },
    { unit: "minute", seconds: 60 },
  ];
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

  for (const interval of intervals) {
    const delta = Math.round(seconds / interval.seconds);
    if (Math.abs(delta) >= 1) {
      return formatter.format(delta, interval.unit);
    }
  }

  return "just now";
}

function getNotificationMeta(channel) {
  if (channel === "SMS") {
    return {
      label: "SMS",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"
          />
        </svg>
      ),
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (channel === "BOTH") {
    return {
      label: "Email + SMS",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z"
          />
        </svg>
      ),
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Email",
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z"
        />
      </svg>
    ),
    className: "bg-sky-100 text-sky-700",
  };
}

function NotificationBell({ notifications, loading, error, isOpen, onToggle, onRefresh }) {
  const unreadCount = notifications.length;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 text-gray-500"
        aria-label="Open notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <>
            <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-400 ring-2 ring-white" />
          </>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-[22rem] max-w-[calc(100vw-2rem)] rounded-2xl border border-gray-100 bg-white shadow-2xl shadow-blue-900/10 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-50/50">
            <div>
              <p className="text-sm font-bold text-gray-900">Notifications</p>
              <p className="text-[11px] text-gray-500 mt-0.5">Latest updates for your account</p>
            </div>
            <button
              onClick={onRefresh}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              Refresh
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="animate-pulse rounded-2xl border border-gray-100 p-3">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-2xl bg-gray-100 shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-24 bg-gray-100 rounded" />
                        <div className="h-3 w-full bg-gray-50 rounded" />
                        <div className="h-3 w-16 bg-gray-50 rounded" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-4">
                <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                    />
                  </svg>
                </div>
                <p className="mt-3 text-sm font-semibold text-gray-700">No new notifications</p>
              </div>
            ) : (
              <div className="p-3 space-y-2">
                {notifications.map((notification) => {
                  const meta = getNotificationMeta(notification.channel);

                  return (
                    <div key={notification.id} className="rounded-2xl border border-gray-100 px-3 py-3 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-2xl shrink-0 flex items-center justify-center ${meta.className}`}>
                          {meta.icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-3">
                            <p className="text-sm font-bold text-gray-900 truncate">
                              {notification.subject || "Notification"}
                            </p>
                            <span className="text-[11px] text-gray-400 shrink-0">
                              {formatRelativeTime(notification.createdAt)}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-gray-600 leading-5">
                            {truncateText(notification.message || "No message content available.", 90)}
                          </p>
                          <div className="mt-2 flex items-center gap-2 text-[11px]">
                            <span className={`inline-flex items-center rounded-full px-2 py-1 font-semibold ${STATUS_STYLES[notification.status] || "bg-gray-100 text-gray-600"}`}>
                              {notification.status || "UNKNOWN"}
                            </span>
                            <span className="text-gray-400">{meta.label}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/70">
            <Link href="/dashboard/notifications" className="text-sm font-semibold text-blue-600 hover:text-blue-700">
              View All
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PatientDashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const bellRef = useRef(null);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patient, setPatient] = useState(null);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [notificationLoading, setNotificationLoading] = useState(false);
  const [notificationError, setNotificationError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setPatient(JSON.parse(stored));
    } catch (_) {}
  }, []);

  useEffect(() => {
    if (!patient) return;

    const role = patient.role;
    const isAdminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");

    if (role === "doctor") {
      router.replace("/doctor/dashboard");
      return;
    }

    if (role === "admin" && !isAdminRoute) {
      router.replace("/dashboard/admin");
    }
  }, [patient, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
    setNotificationOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!notificationOpen) return undefined;

    const handleClickOutside = (event) => {
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [notificationOpen]);

  const fetchNotifications = useCallback(async (limit = 5) => {
    if (patient?.role !== "patient") return;

    setNotificationLoading(true);
    setNotificationError("");

    try {
      const response = await api.get("/patients/notifications", { params: { limit } });
      setNotifications(response.data.notifications || []);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
      setNotificationError(error.response?.data?.message || "Could not load notifications.");
    } finally {
      setNotificationLoading(false);
    }
  }, [patient?.role]);

  useEffect(() => {
    if (patient?.role !== "patient") return undefined;

    fetchNotifications(5);
    const intervalId = window.setInterval(() => {
      fetchNotifications(5);
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [fetchNotifications, patient?.role]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    if (href === "/appointments") return pathname === "/appointments";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const breadcrumbLabel = useMemo(
    () => BREADCRUMB_MAP[pathname] || pathname.split("/").pop() || "Dashboard",
    [pathname]
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen bg-white border-r border-gray-100
          flex flex-col shadow-xl shadow-blue-900/5
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:w-64 lg:static lg:shadow-none
        `}
      >
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">MediCare</p>
            <p className="text-[10px] text-blue-500 font-medium tracking-wide uppercase">
              {patient?.role === "admin" ? "Admin Portal" : "Patient Portal"}
            </p>
          </div>
        </div>

        {patient && (
          <div className="flex items-center gap-3 px-4 py-4 mx-3 mt-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {getInitials(patient.name || patient.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {patient.name || "Patient"}
              </p>
              <p className="text-[10px] text-blue-500 truncate">{patient.email || ""}</p>
            </div>
          </div>
        )}

        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter((item) => {
              if (item.adminOnly && patient?.role !== "admin") return false;
              if (item.patientOnly && patient?.role === "admin") return false;
              return true;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={section.heading}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-widest px-3 pb-1.5">
                  {section.heading}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const active = isActive(item.href);

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`
                          flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium
                          transition-all duration-200 ease-in-out group relative
                          ${active ? "bg-blue-50 text-blue-700 shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"}
                        `}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-blue-600 transition-all duration-200" />
                        )}
                        <span className={`shrink-0 transition-colors duration-200 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"}`}>
                          {item.icon}
                        </span>
                        <span className="truncate">{item.label}</span>
                        {active && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="px-3 pb-5 border-t border-gray-100 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-red-500 hover:bg-red-50 transition-all duration-200 ease-in-out group"
          >
            <svg className="w-5 h-5 transition-colors duration-200 text-red-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 sm:px-6 py-3 flex items-center justify-between shadow-sm">
          <button
            id="patient-sidebar-toggle-btn"
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 rounded-lg hover:bg-gray-100 transition-colors duration-200 text-gray-500"
            aria-label="Open sidebar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          <div className="hidden lg:flex items-center gap-2 text-sm text-gray-500">
            <span className="text-gray-400">
              {patient?.role === "admin" ? "Admin Portal" : "Patient Portal"}
            </span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-700">{breadcrumbLabel}</span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            {patient?.role === "patient" ? (
              <div ref={bellRef}>
                <NotificationBell
                  notifications={notifications}
                  loading={notificationLoading}
                  error={notificationError}
                  isOpen={notificationOpen}
                  onToggle={() => {
                    const nextOpen = !notificationOpen;
                    setNotificationOpen(nextOpen);
                    if (nextOpen) fetchNotifications(5);
                  }}
                  onRefresh={() => fetchNotifications(5)}
                />
              </div>
            ) : (
              <button className="p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 text-gray-500" aria-label="Notifications">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
                  />
                </svg>
              </button>
            )}

            {patient && (
              <Link
                href={patient.role === "admin" ? "/dashboard/admin/profile" : "/dashboard/profile"}
                className="flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-200"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">
                    {patient.name || "Patient"}
                  </p>
                  <p className="text-[10px] text-gray-400">{patient.email || ""}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  {getInitials(patient.name || patient.email)}
                </div>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
