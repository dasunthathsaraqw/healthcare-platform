"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";

const API_BASE =
  (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8080/api";
const APPOINTMENT_API_BASE =
  (process.env.NEXT_PUBLIC_APPOINTMENT_API_URL || process.env.NEXT_PUBLIC_API_URL) ||
  "http://localhost:8080/api";

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
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  confirmed: "bg-blue-50 text-blue-700 border-blue-200",
  completed: "bg-slate-50 text-slate-600 border-slate-200",
  cancelled: "bg-gray-100 text-gray-400 border-gray-200",
  rejected: "bg-red-50 text-red-500 border-red-200",
};

// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Patients: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Clock: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  Document: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={1.6} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  Error: () => (
    <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd"
        d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
        clipRule="evenodd" />
    </svg>
  ),
  Check: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  EmptyCalendar: () => (
    <svg className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth={1.4} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round"
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
};

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, variant, loading }) {
  const variants = {
    blue: { wrap: "border-blue-100", iconWrap: "bg-blue-600 text-white", num: "text-blue-700" },
    slate: { wrap: "border-slate-200", iconWrap: "bg-slate-700 text-white", num: "text-slate-800" },
    amber: { wrap: "border-amber-100", iconWrap: "bg-amber-500 text-white", num: "text-amber-700" },
    indigo: { wrap: "border-indigo-100", iconWrap: "bg-indigo-600 text-white", num: "text-indigo-700" },
  };
  const v = variants[variant] || variants.blue;
  return (
    <div className={`bg-white rounded-xl border ${v.wrap} p-5 flex items-center gap-4 shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className={`w-11 h-11 rounded-lg ${v.iconWrap} flex items-center justify-center shrink-0`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">{label}</p>
        {loading ? (
          <div className="h-7 w-10 bg-gray-100 rounded animate-pulse" />
        ) : (
          <p className={`text-2xl font-bold ${v.num} leading-none`}>{value ?? "—"}</p>
        )}
      </div>
    </div>
  );
}

// ── Appointment Row (Pending) ─────────────────────────────────────────────────
function AppointmentRow({ appt, onAccept, onReject, actionLoading }) {
  const patientName = appt.patientName || appt.patientId?.name || "Patient";
  const time = formatTime(appt.dateTime || appt.date);
  const status = appt.status || "pending";
  const initials = patientName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center justify-between gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0 tracking-wide">
          {initials}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-800 truncate">{patientName}</p>
          <p className="text-xs text-gray-400 mt-0.5">{time}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize tracking-wide ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
          {status}
        </span>
        {status === "pending" && (
          <>
            <button
              onClick={() => onAccept(appt._id)}
              disabled={actionLoading === appt._id}
              className="h-7 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold
                disabled:opacity-40 transition-colors"
            >
              {actionLoading === appt._id ? "..." : "Accept"}
            </button>
            <button
              onClick={() => onReject(appt._id)}
              disabled={actionLoading === appt._id}
              className="h-7 px-3 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50 hover:border-gray-300 text-xs font-semibold
                disabled:opacity-40 transition-colors"
            >
              Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Schedule Row ──────────────────────────────────────────────────────────────
function ScheduleRow({ appt }) {
  const patientName = appt.patientName || appt.patientId?.name || "Patient";
  const time = formatTime(appt.dateTime || appt.date);
  const status = appt.status || "confirmed";
  const initials = patientName.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-gray-50 last:border-0">
      <div className="w-14 shrink-0 text-right">
        <p className="text-xs font-bold text-blue-600 tabular-nums">{time}</p>
      </div>
      <div className="w-px h-8 bg-gray-100 shrink-0" />
      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-white text-[10px] font-bold shrink-0 tracking-wide">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{patientName}</p>
        <p className="text-xs text-gray-400 truncate mt-0.5">
          {appt.reason || appt.type || "General Consultation"}
        </p>
      </div>
      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border capitalize tracking-wide shrink-0 ${STATUS_STYLES[status] || STATUS_STYLES.confirmed}`}>
        {status}
      </span>
    </div>
  );
}

// ── Skeleton Loaders ──────────────────────────────────────────────────────────
function ScheduleSkeleton() {
  return (
    <div className="py-4 space-y-4 px-5">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-3 animate-pulse">
          <div className="w-14 h-3 bg-gray-100 rounded" />
          <div className="w-px h-6 bg-gray-100" />
          <div className="w-8 h-8 bg-gray-100 rounded-lg" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-32" />
            <div className="h-2.5 bg-gray-100 rounded w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PendingSkeleton() {
  return (
    <div className="py-4 space-y-4 px-5">
      {[1, 2].map((i) => (
        <div key={i} className="flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gray-100 rounded-lg" />
            <div className="space-y-1.5">
              <div className="w-28 h-3 bg-gray-100 rounded" />
              <div className="w-16 h-2.5 bg-gray-100 rounded" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="w-16 h-7 bg-gray-100 rounded-md" />
            <div className="w-14 h-7 bg-gray-100 rounded-md" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Empty States ──────────────────────────────────────────────────────────────
function EmptyState({ icon, primary, secondary }) {
  return (
    <div className="py-12 text-center px-5">
      <div className="w-12 h-12 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-center mx-auto mb-3 text-gray-300">
        {icon}
      </div>
      <p className="text-sm font-medium text-gray-400">{primary}</p>
      {secondary && <p className="text-xs text-gray-300 mt-1">{secondary}</p>}
    </div>
  );
}

// ── Section Header ────────────────────────────────────────────────────────────
function SectionHeader({ title, subtitle, badge, badgeVariant = "blue" }) {
  const badgeStyles = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    amber: "bg-amber-50 text-amber-600 border-amber-100",
    slate: "bg-slate-50 text-slate-600 border-slate-200",
  };
  return (
    <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
      <div>
        <h2 className="text-sm font-bold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      {badge != null && (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badgeStyles[badgeVariant]}`}>
          {badge}
        </span>
      )}
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
  const [actionLoading, setActionLoading] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setDoctor(JSON.parse(stored));
    } catch (_) { }
  }, []);

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

  const fetchPending = useCallback(async () => {
    try {
      const { data } = await axios.get(`${APPOINTMENT_API_BASE}/appointments/manage?status=pending`, {
        headers: authHeaders(),
      });
      setPendingAppts(data.appointments || data || []);
    } catch (err) {
      console.error("Pending appointments error:", err.message);
    } finally {
      setLoading((p) => ({ ...p, pending: false }));
    }
  }, []);

  const fetchToday = useCallback(async () => {
    try {
      const { data } = await axios.get(
        `${APPOINTMENT_API_BASE}/appointments/manage?date=${todayISO()}`,
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

  const handleAccept = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      await axios.put(
        `${APPOINTMENT_API_BASE}/appointments/manage/${id}/status`,
        { status: "confirmed" },
        { headers: authHeaders() }
      );
      setPendingAppts((prev) => prev.filter((a) => a._id !== id));
      fetchStats();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to accept appointment");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    setError("");
    try {
      await axios.put(
        `${APPOINTMENT_API_BASE}/appointments/manage/${id}/status`,
        { status: "rejected", reason: "Declined by doctor" },
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

  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const doctorFirstName = doctor?.name?.split(" ")[0] || "Doctor";

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6 font-sans">

      {/* ── Header Banner ──────────────────────────────────────────────────── */}
      <div className="bg-blue-600 rounded-xl px-6 py-5 flex items-center justify-between gap-4 shadow-sm">
        <div>
          <p className="text-blue-200 text-xs font-medium uppercase tracking-widest mb-1">
            Dashboard
          </p>
          <h1 className="text-xl font-bold text-white leading-tight">
            Dr. {doctorFirstName}
          </h1>
          <p className="text-blue-200 text-sm mt-0.5">{todayLabel}</p>
        </div>
        <div className="w-12 h-12 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white shrink-0">
          <Icons.Shield />
        </div>
      </div>

      {/* ── Error Banner ───────────────────────────────────────────────────── */}
      {error && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-sm">
          <Icons.Error />
          <span>{error}</span>
        </div>
      )}

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          loading={loading.stats}
          label="Total Patients"
          value={stats?.totalPatients}
          variant="blue"
          icon={<Icons.Patients />}
        />
        <StatCard
          loading={loading.today}
          label="Today's Appointments"
          value={todayAppts.length}
          variant="slate"
          icon={<Icons.Calendar />}
        />
        <StatCard
          loading={loading.pending}
          label="Pending Approvals"
          value={pendingAppts.length}
          variant="amber"
          icon={<Icons.Clock />}
        />
        <StatCard
          loading={loading.stats}
          label="Total Prescriptions"
          value={stats?.totalPrescriptions}
          variant="indigo"
          icon={<Icons.Document />}
        />
      </div>

      {/* ── Divider label ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-100" />
        <p className="text-xs font-semibold text-gray-300 uppercase tracking-widest">Overview</p>
        <div className="h-px flex-1 bg-gray-100" />
      </div>

      {/* ── Two-column grid ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Today's Schedule */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Today's Schedule"
            subtitle={todayLabel}
            badge={`${todayAppts.length} appt${todayAppts.length !== 1 ? "s" : ""}`}
            badgeVariant="blue"
          />
          {loading.today ? (
            <ScheduleSkeleton />
          ) : todayAppts.length === 0 ? (
            <EmptyState
              icon={<Icons.EmptyCalendar />}
              primary="No appointments today"
              secondary="Your schedule is clear"
            />
          ) : (
            <div className="px-5 divide-y divide-gray-50">
              {todayAppts.map((appt) => (
                <ScheduleRow key={appt._id} appt={appt} />
              ))}
            </div>
          )}
        </div>

        {/* Pending Approvals */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <SectionHeader
            title="Pending Approvals"
            subtitle="Awaiting your decision"
            badge={pendingAppts.length > 0 ? `${pendingAppts.length} pending` : undefined}
            badgeVariant="amber"
          />
          {loading.pending ? (
            <PendingSkeleton />
          ) : pendingAppts.length === 0 ? (
            <EmptyState
              icon={<Icons.Check />}
              primary="All caught up"
              secondary="No pending appointments"
            />
          ) : (
            <div className="px-5 divide-y divide-gray-50">
              {pendingAppts.map((appt) => (
                <AppointmentRow
                  key={appt._id}
                  appt={appt}
                  onAccept={handleAccept}
                  onReject={handleReject}
                  actionLoading={actionLoading}
                />
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}