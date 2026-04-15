"use client";

import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

// ── Helpers ───────────────────────────────────────────────────────────────────
function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${token}` };
}

function formatTime(str) {
  if (!str) return "—";
  const d = new Date(str);
  return isNaN(d) ? str : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

const STATUS_STYLES = {
  pending:   "bg-amber-50  text-amber-700  border-amber-200",
  confirmed: "bg-blue-50   text-blue-700   border-blue-200",
  completed: "bg-green-50  text-green-700  border-green-200",
  cancelled: "bg-gray-100  text-gray-500   border-gray-200",
  rejected:  "bg-red-50    text-red-600    border-red-200",
};

// ── Subcomponents ─────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, color, loading }) {
  const colorMap = {
    blue:   { bg: "bg-blue-50",   icon: "bg-blue-100 text-blue-600",   text: "text-blue-700" },
    green:  { bg: "bg-green-50",  icon: "bg-green-100 text-green-600",  text: "text-green-700" },
    amber:  { bg: "bg-amber-50",  icon: "bg-amber-100 text-amber-600",  text: "text-amber-700" },
    purple: { bg: "bg-purple-50", icon: "bg-purple-100 text-purple-600", text: "text-purple-700" },
  };
  const c = colorMap[color] || colorMap.blue;

  return (
    <div className={`${c.bg} rounded-2xl p-5 flex items-center gap-4 border border-white shadow-sm`}>
      <div className={`w-12 h-12 rounded-xl ${c.icon} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        {loading ? (
          <div className="h-7 w-12 bg-gray-200 rounded animate-pulse" />
        ) : (
          <p className={`text-2xl font-bold ${c.text}`}>{value ?? "—"}</p>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({ appt, onAccept, onReject, actionLoading }) {
  const patientName = appt.patientName || appt.patientId?.name || "Patient";
  const time = formatTime(appt.dateTime || appt.date);
  const status = appt.status || "pending";

  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        {/* Avatar */}
        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {patientName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{patientName}</p>
          <p className="text-xs text-gray-400">{time}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
          {status}
        </span>

        {status === "pending" && (
          <>
            <button
              onClick={() => onAccept(appt._id)}
              disabled={actionLoading === appt._id}
              className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold
                disabled:opacity-50 transition-colors shadow-sm"
            >
              {actionLoading === appt._id ? "…" : "Accept"}
            </button>
            <button
              onClick={() => onReject(appt._id)}
              disabled={actionLoading === appt._id}
              className="px-3 py-1.5 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 text-xs font-semibold
                disabled:opacity-50 transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function ScheduleRow({ appt }) {
  const patientName = appt.patientName || appt.patientId?.name || "Patient";
  const time = formatTime(appt.dateTime || appt.date);
  const status = appt.status || "confirmed";

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 last:border-0">
      <div className="text-center w-14 shrink-0">
        <p className="text-xs font-bold text-blue-600">{time}</p>
      </div>
      <div className="w-px h-8 bg-gray-200 shrink-0" />
      <div className="flex items-center gap-2.5 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-400 to-blue-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
          {patientName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-800 truncate">{patientName}</p>
          <p className="text-xs text-gray-400 truncate">
            {appt.reason || appt.type || "General Consultation"}
          </p>
        </div>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border capitalize shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.confirmed}`}>
        {status}
      </span>
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function DoctorDashboardPage() {
  const [doctor, setDoctor] = useState(null);
  const [stats, setStats] = useState(null);
  const [pendingAppts, setPendingAppts] = useState([]);
  const [todayAppts, setTodayAppts] = useState([]);
  const [loading, setLoading] = useState({ stats: true, pending: true, today: true });
  const [actionLoading, setActionLoading] = useState(null); // appointment id being actioned
  const [error, setError] = useState("");

  // Load doctor from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setDoctor(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/dashboard/stats`, {
        headers: authHeaders(),
      });
      setStats(data.stats || data);
    } catch (err) {
      console.error("Stats error:", err.message);
    } finally {
      setLoading((p) => ({ ...p, stats: false }));
    }
  }, []);

  // Fetch pending appointments
  const fetchPending = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/appointments?status=pending`, {
        headers: authHeaders(),
      });
      setPendingAppts(data.appointments || data || []);
    } catch (err) {
      console.error("Pending appointments error:", err.message);
    } finally {
      setLoading((p) => ({ ...p, pending: false }));
    }
  }, []);

  // Fetch today's appointments
  const fetchToday = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${API_BASE}/doctors/appointments?date=${todayISO()}`,
        { headers: authHeaders() }
      );
      setTodayAppts(data.appointments || data || []);
    } catch (err) {
      console.error("Today's appointments error:", err.message);
    } finally {
      setLoading((p) => ({ ...p, today: false }));
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchPending();
    fetchToday();
  }, [fetchStats, fetchPending, fetchToday]);

  // Accept appointment
  const handleAccept = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      await axios.put(
        `${API_BASE}/doctors/appointments/${id}/accept`,
        {},
        { headers: authHeaders() }
      );
      // Optimistic update
      setPendingAppts((prev) => prev.filter((a) => a._id !== id));
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept appointment");
    } finally {
      setActionLoading(null);
    }
  };

  // Reject appointment
  const handleReject = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      await axios.put(
        `${API_BASE}/doctors/appointments/${id}/reject`,
        { reason: "Declined by doctor" },
        { headers: authHeaders() }
      );
      setPendingAppts((prev) => prev.filter((a) => a._id !== id));
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to reject appointment");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Date display ─────────────────────────────────────────────────────────────
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* ── Welcome banner ─────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-600 to-cyan-500 p-6 text-white shadow-lg shadow-blue-200">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              Welcome back, Dr. {doctor?.name?.split(" ")[0] || "Doctor"}! 👋
            </h1>
            <p className="text-blue-100 text-sm">{todayLabel}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
            <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>

      {/* ── Error banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Stats cards ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={loading.stats}
          label="Total Patients"
          value={stats?.totalPatients}
          color="blue"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          }
        />
        <StatCard
          loading={loading.today}
          label="Today's Appointments"
          value={todayAppts.length}
          color="green"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        <StatCard
          loading={loading.pending}
          label="Pending Approvals"
          value={pendingAppts.length}
          color="amber"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          loading={loading.stats}
          label="Total Prescriptions"
          value={stats?.totalPrescriptions}
          color="purple"
          icon={
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
      </div>

      {/* ── Bottom grid: schedule + pending ────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Schedule */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Today's Schedule</h2>
              <p className="text-xs text-gray-400 mt-0.5">{todayLabel}</p>
            </div>
            <span className="text-xs bg-blue-50 text-blue-600 font-semibold px-2.5 py-1 rounded-full">
              {todayAppts.length} appt{todayAppts.length !== 1 ? "s" : ""}
            </span>
          </div>
          <div className="px-5 divide-y divide-gray-50">
            {loading.today ? (
              <div className="py-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-14 h-4 bg-gray-100 rounded" />
                    <div className="w-px h-6 bg-gray-100" />
                    <div className="flex-1 h-4 bg-gray-100 rounded" />
                  </div>
                ))}
              </div>
            ) : todayAppts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">No appointments today</p>
              </div>
            ) : (
              todayAppts.map((appt) => (
                <ScheduleRow key={appt._id} appt={appt} />
              ))
            )}
          </div>
        </div>

        {/* Pending Appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-bold text-gray-900">Pending Approvals</h2>
              <p className="text-xs text-gray-400 mt-0.5">Awaiting your decision</p>
            </div>
            {pendingAppts.length > 0 && (
              <span className="text-xs bg-amber-50 text-amber-600 font-semibold px-2.5 py-1 rounded-full border border-amber-100">
                {pendingAppts.length} pending
              </span>
            )}
          </div>
          <div className="px-5">
            {loading.pending ? (
              <div className="py-6 space-y-4">
                {[1, 2].map((i) => (
                  <div key={i} className="flex items-center justify-between animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gray-100" />
                      <div className="space-y-1.5">
                        <div className="w-28 h-3 bg-gray-100 rounded" />
                        <div className="w-16 h-2.5 bg-gray-100 rounded" />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <div className="w-16 h-7 bg-gray-100 rounded-lg" />
                      <div className="w-16 h-7 bg-gray-100 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : pendingAppts.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-3">
                  <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-sm text-gray-400">All caught up!</p>
                <p className="text-xs text-gray-300 mt-1">No pending appointments</p>
              </div>
            ) : (
              pendingAppts.map((appt) => (
                <AppointmentRow
                  key={appt._id}
                  appt={appt}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  actionLoading={actionLoading}
                />
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
