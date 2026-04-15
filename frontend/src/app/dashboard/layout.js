"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

// ── Nav sections — Patient & Notification domain only ─────────────────────────
const NAV_SECTIONS = [
  {
    heading: "Overview",
    items: [
      {
        label: "Dashboard",
        href: "/dashboard",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
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
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        ),
      },
      {
        label: "Health Metrics",
        href: "/dashboard/metrics",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
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
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        ),
      },
      {
        label: "Notifications",
        href: "/dashboard/settings/notifications",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        ),
      },
      {
        label: "Data & Privacy",
        href: "/dashboard/settings/privacy",
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        ),
      },
      {
        label: "Admin Panel",
        href: "/dashboard/admin",
        adminOnly: true,
        icon: (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        ),
      },
    ],
  },
];

// ── Breadcrumb map ────────────────────────────────────────────────────────────
const BREADCRUMB_MAP = {
  "/dashboard": "Dashboard",
  "/dashboard/reports": "Medical Vault",
  "/dashboard/metrics": "Health Metrics",
  "/dashboard/profile": "My Profile",
  "/dashboard/settings/notifications": "Notifications",
  "/dashboard/settings/privacy": "Data & Privacy",
  "/dashboard/admin": "Admin Panel",
};

// ── Avatar initials helper ────────────────────────────────────────────────────
function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "PT";
}

export default function PatientDashboardLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [patient, setPatient] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setPatient(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // ── Role-based route guard ────────────────────────────────────────────
  useEffect(() => {
    if (!patient) return;

    const role = patient.role;
    const isAdminRoute = pathname === "/dashboard/admin" || pathname.startsWith("/dashboard/admin/");

    // Doctors should never be in the patient dashboard
    if (role === "doctor") {
      router.replace("/doctor/dashboard");
      return;
    }

    // Admins can access /dashboard/admin but not patient-specific routes
    if (role === "admin" && !isAdminRoute) {
      router.replace("/dashboard/admin");
      return;
    }
  }, [patient, pathname, router]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    router.push("/login");
  };

  const isActive = (href) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/40 backdrop-blur-sm lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 z-30 h-screen bg-white border-r border-gray-100
          flex flex-col shadow-xl shadow-blue-900/5
          transition-all duration-300 ease-in-out
          ${sidebarOpen ? "w-64 translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:w-64 lg:static lg:shadow-none
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5 border-b border-gray-100">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-500 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900 leading-tight">MediCare</p>
            <p className="text-[10px] text-blue-500 font-medium tracking-wide uppercase">Patient Portal</p>
          </div>
        </div>

        {/* Patient mini-profile */}
        {patient && (
          <div className="flex items-center gap-3 px-4 py-4 mx-3 mt-3 rounded-xl bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-100/50">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
              {getInitials(patient.name || patient.email)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate">
                {patient.name || "Patient"}
              </p>
              <p className="text-[10px] text-blue-500 truncate">
                {patient.email || ""}
              </p>
            </div>
          </div>
        )}

        {/* Nav — sectioned */}
        <nav className="flex-1 px-3 py-3 overflow-y-auto space-y-4">
          {NAV_SECTIONS.map((section) => {
            const visibleItems = section.items.filter(
              (item) => !item.adminOnly || patient?.role === "admin"
            );
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
                        ${active
                          ? "bg-blue-50 text-blue-700 shadow-sm"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                        }
                      `}
                    >
                      {active && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 rounded-r-full bg-blue-600 transition-all duration-200" />
                      )}
                      <span className={`shrink-0 transition-colors duration-200 ${active ? "text-blue-600" : "text-gray-400 group-hover:text-blue-500"}`}>
                        {item.icon}
                      </span>
                      <span className="truncate">{item.label}</span>
                      {active && (
                        <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="px-3 pb-5 border-t border-gray-100 pt-3">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium
              text-red-500 hover:bg-red-50 transition-all duration-200 ease-in-out group"
          >
            <svg className="w-5 h-5 transition-colors duration-200 text-red-400 group-hover:text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
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
            <span className="text-gray-400">Patient Portal</span>
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-gray-700">
              {BREADCRUMB_MAP[pathname] || pathname.split("/").pop() || "Dashboard"}
            </span>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button className="relative p-2 rounded-xl hover:bg-gray-100 transition-colors duration-200 text-gray-500">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
            </button>

            {patient && (
              <Link href="/dashboard/profile" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity duration-200">
                <div className="text-right hidden sm:block">
                  <p className="text-xs font-semibold text-gray-900 leading-tight">{patient.name || "Patient"}</p>
                  <p className="text-[10px] text-gray-400">{patient.email || ""}</p>
                </div>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0 shadow-sm">
                  {getInitials(patient.name || patient.email)}
                </div>
              </Link>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
