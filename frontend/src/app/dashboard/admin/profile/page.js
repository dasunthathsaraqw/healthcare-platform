"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/services/api";

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 animate-pulse">
      <div className="h-4 w-28 bg-gray-100 rounded" />
      <div className="h-8 w-20 bg-gray-200 rounded mt-3" />
      <div className="h-3 w-32 bg-gray-100 rounded mt-3" />
    </div>
  );
}

function formatCurrency(amount) {
  return `Rs. ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export default function AdminProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [stats, setStats] = useState({
    totalUsers: 0,
    appointmentsToday: 0,
    revenueMonth: 0,
    activeServices: 0,
  });
  const [services, setServices] = useState({});

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (!stored) {
        router.push("/login");
        return;
      }

      const parsed = JSON.parse(stored);
      if (parsed.role !== "admin") {
        router.replace("/dashboard");
        return;
      }
    } catch (_error) {
      router.push("/login");
      return;
    }

    const loadPage = async () => {
      setLoading(true);
      setError("");

      try {
        const [profileRes, usersRes, appointmentsRes, paymentsRes, healthRes] = await Promise.all([
          api.get("/auth/me"),
          api.get("/patients/admin/users", { params: { limit: 1 } }),
          api.get("/appointments/admin/stats"),
          api.get("/payments/admin/all"),
          api.get("/system/health"),
        ]);

        const adminProfile = profileRes.data.user;
        const userCount = usersRes.data.count || usersRes.data.total || usersRes.data.users?.length || 0;
        const appointmentStats = appointmentsRes.data.stats || {};
        const payments = paymentsRes.data.payments || [];
        const serviceHealth = healthRes.data.services || {};

        const now = new Date();
        const revenueMonth = payments
          .filter((payment) => {
            if (!payment?.createdAt) return false;
            const createdAt = new Date(payment.createdAt);
            return (
              createdAt.getFullYear() === now.getFullYear() &&
              createdAt.getMonth() === now.getMonth() &&
              (payment.status === "completed" || payment.status === "refunded" || payment.status === "pending")
            );
          })
          .reduce((sum, payment) => sum + (payment.amount || 0), 0);

        const activeServices = Object.values(serviceHealth).filter((service) => service.ok).length;

        setProfile(adminProfile);
        setServices(serviceHealth);
        setStats({
          totalUsers: userCount,
          appointmentsToday: appointmentStats.appointmentsToday || 0,
          revenueMonth,
          activeServices,
        });
      } catch (err) {
        console.error("Failed to load admin profile:", err);
        setError(err.response?.data?.message || "Could not load the admin overview.");
      } finally {
        setLoading(false);
      }
    };

    loadPage();
  }, [router]);

  const serviceEntries = useMemo(() => Object.entries(services), [services]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="animate-pulse">
          <div className="h-8 w-72 bg-gray-200 rounded" />
          <div className="h-4 w-96 bg-gray-100 rounded mt-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <SkeletonCard key={item} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse h-72" />
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 animate-pulse h-72" />
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Profile & System Overview</h1>
        <p className="text-sm text-gray-500 mt-1">
          Monitor your admin account details, platform activity, and service health in one place.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
          <p className="text-xs text-gray-400 mt-2">Across all patient, doctor, and admin accounts</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500">Appointments Today</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{stats.appointmentsToday}</p>
          <p className="text-xs text-gray-400 mt-2">Today&apos;s active appointment schedule</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500">Revenue This Month</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{formatCurrency(stats.revenueMonth)}</p>
          <p className="text-xs text-gray-400 mt-2">Calculated from current monthly payment records</p>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-xs font-semibold text-gray-500">System Health</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">
            {stats.activeServices}/{serviceEntries.length || 0}
          </p>
          <p className="text-xs text-gray-400 mt-2">Core services responding to health checks</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="bg-gradient-to-r from-slate-900 to-slate-800 p-6 text-white">
            <h2 className="text-lg font-bold">Admin Credentials</h2>
            <p className="text-slate-300 text-xs mt-1">Live account information from the auth service</p>
          </div>
          <div className="p-6 space-y-4">
            {[
              { label: "Name", value: profile?.name || "Unavailable" },
              { label: "Email", value: profile?.email || "Unavailable" },
              { label: "Role", value: profile?.role ? `${profile.role.charAt(0).toUpperCase()}${profile.role.slice(1)}` : "Unavailable" },
              { label: "Phone", value: profile?.phone || "Not set" },
            ].map((item) => (
              <div key={item.label}>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-1 break-words">{item.value}</p>
              </div>
            ))}
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Status</p>
              <span className={`inline-flex items-center mt-1 px-2.5 py-1 rounded-md text-xs font-bold border ${
                profile?.isActive === false
                  ? "bg-red-50 text-red-700 border-red-200"
                  : "bg-green-50 text-green-700 border-green-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${profile?.isActive === false ? "bg-red-500" : "bg-green-500"}`} />
                {profile?.isActive === false ? "Inactive" : "Active"}
              </span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-gray-900">Service Health</h2>
              <p className="text-xs text-gray-500 mt-1">Current status from the gateway&apos;s aggregated health checks</p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {serviceEntries.map(([serviceName, service]) => (
              <div key={serviceName} className="rounded-2xl border border-gray-100 bg-gray-50/70 px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{serviceName}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {service.details?.service || "Service check"}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                    service.ok ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  }`}>
                    {service.ok ? "Healthy" : "Down"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  HTTP {service.status || "N/A"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
