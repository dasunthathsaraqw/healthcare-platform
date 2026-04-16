"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_APPOINTMENT_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric", year: "numeric",
  });
}

function fmtTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "DR";
}

// Updated status styles with cancellation_requested
const STATUS_STYLES = {
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500", label: "Confirmed" },
  completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500", label: "Completed" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-400", label: "Cancelled" },
  rejected: { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", dot: "bg-red-400", label: "Rejected" },
  cancellation_requested: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-500", label: "Cancellation Requested" },
};

function AppointmentCard({ appt, onClick }) {
  const status = appt.status || "confirmed";
  const sc = STATUS_STYLES[status] || STATUS_STYLES.confirmed;
  const docName = appt.doctorName || "Doctor";
  const spec = appt.specialty || "";
  const dt = appt.dateTime || appt.date;

  return (
    <button
      onClick={() => onClick(appt)}
      className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all p-4 flex items-center gap-3 group"
    >
      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm group-hover:scale-105 transition-transform">
        {getInitials(docName)}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-bold text-gray-900 truncate">{docName}</p>
          {spec && <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">{spec}</span>}
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          {fmtDate(dt)}{fmtTime(dt) ? ` · ${fmtTime(dt)}` : ""}
        </p>
        {appt.patientNumber && (
          <p className="text-[10px] text-gray-400 mt-1">Patient #{appt.patientNumber}</p>
        )}
        {/* Show refund pending badge */}
        {appt.refundAmount > 0 && appt.status === "cancellation_requested" && (
          <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg inline-block">
            <p className="text-[9px] text-amber-600">
              Refund requested: Rs. {appt.refundAmount}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
          <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot} mr-1`} />
          {sc.label}
        </span>
        <svg className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT DETAIL MODAL (with refund info)
// ─────────────────────────────────────────────────────────────────────────────

function AppointmentDetailModal({ open, appt, onClose, onCancel, cancelling }) {
  const router = useRouter();
  const [cancelStep, setCancelStep] = useState("view");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setCancelStep("view");
      setReason("");
    }
  }, [open, appt]);

  if (!open || !appt || typeof window === "undefined") return null;

  const status = appt.status || "confirmed";
  const sc = STATUS_STYLES[status] || STATUS_STYLES.confirmed;
  const docName = appt.doctorName || "Doctor";
  const dt = appt.dateTime || appt.date;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white relative">
          <button onClick={onClose} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur shadow-inner flex items-center justify-center text-white text-3xl font-bold border border-white/30 overflow-hidden">
              {getInitials(docName)}
            </div>
            <div>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">Appointment Details</p>
              <h2 className="text-2xl font-black">{docName}</h2>
              <p className="text-blue-100 text-sm font-medium">{appt.specialty || "Specialist"}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-8">
          {/* Status and Time Row */}
          <div className="flex flex-col sm:flex-row gap-4 sm:items-center justify-between bg-slate-50 p-5 rounded-2xl border border-slate-100">
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">When</p>
              <p className="text-sm font-bold text-slate-900">{fmtDate(dt)}</p>
              <p className="text-xs text-blue-600 font-bold mt-0.5">{fmtTime(dt)}</p>
            </div>
            <div className="h-px sm:h-8 sm:w-px bg-slate-200" />
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Status</p>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${sc.bg} ${sc.text} ${sc.border}`}>
                <span className={`w-2 h-2 rounded-full ${sc.dot}`} />
                {sc.label}
              </span>
              {appt.refundAmount > 0 && appt.status === "cancellation_requested" && (
                <p className="text-[10px] text-amber-600 font-semibold mt-1">
                  Refund: Rs. {appt.refundAmount} pending admin approval
                </p>
              )}
            </div>
          </div>

          {/* Fee Display - Already Paid */}
          {appt.consultationFee > 0 && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
              <span className="text-sm font-semibold text-gray-700">Amount Paid</span>
              <span className="text-lg font-bold text-green-600">Rs. {appt.consultationFee.toFixed(2)}</span>
            </div>
          )}

          {/* Reason for Visit */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reason for Visit
            </h3>
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed italic">
                {appt.reason || "No specific reason provided for this consultation."}
              </p>
            </div>
          </div>

          {/* Guest Info if applicable */}
          {appt.isForSomeoneElse && appt.bookedFor?.name && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <svg className="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Booked For
              </h3>
              <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-100">
                <p className="text-sm font-semibold text-purple-700">{appt.bookedFor.name}</p>
                {appt.bookedFor.email && <p className="text-xs text-purple-500 mt-1">{appt.bookedFor.email}</p>}
                {appt.bookedFor.age && <p className="text-xs text-purple-500">Age: {appt.bookedFor.age}</p>}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="space-y-3 pt-2">
            {cancelStep === "view" ? (
              <>
                {status === "confirmed" && (
                  <button
                    onClick={() => router.push(`/dashboard/consultation/${appt._id}`)}
                    className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-3 overflow-hidden group"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Join Video Consultation
                  </button>
                )}

                <div className="flex gap-3">
                  {(status === "confirmed") && (
                    <button
                      onClick={() => setCancelStep("confirm")}
                      className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-400 text-xs font-bold hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all flex items-center justify-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel Appointment
                    </button>
                  )}
                  <button
                    onClick={onClose}
                    className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-[slideUp_0.2s_ease-out]">
                {/* Refund Information Display */}
                <div className="bg-amber-50 p-4 rounded-xl border border-amber-100">
                  <p className="text-xs font-semibold text-amber-700 mb-2 flex items-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Refund Policy
                  </p>
                  <div className="space-y-1 text-xs text-amber-600">
                    <p className="flex justify-between">
                      <span>✓ 24+ hours before:</span>
                      <span className="font-semibold">100% refund</span>
                    </p>
                    <p className="flex justify-between">
                      <span>✓ 12-24 hours before:</span>
                      <span className="font-semibold">50% refund</span>
                    </p>
                    <p className="flex justify-between">
                      <span>✓ 6-12 hours before:</span>
                      <span className="font-semibold">25% refund</span>
                    </p>
                    <p className="flex justify-between">
                      <span>✗ Less than 6 hours:</span>
                      <span className="font-semibold">No refund</span>
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-amber-200">
                    <p className="text-[10px] text-amber-500">
                      Refunds require admin approval and will be processed within 3-5 business days
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                    Please provide a reason for cancellation
                  </label>
                  <textarea
                    autoFocus
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="e.g., I have a personal emergency..."
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-200 transition-all resize-none h-24"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCancelStep("view")}
                    className="flex-1 py-3.5 rounded-2xl border border-slate-100 text-slate-500 text-xs font-bold hover:bg-slate-50 transition-all"
                  >
                    Back
                  </button>
                  <button
                    onClick={() => onCancel(appt._id, reason)}
                    disabled={cancelling === appt._id || !reason.trim()}
                    className="flex-[2] py-3.5 rounded-2xl bg-red-600 text-white text-xs font-black shadow-lg shadow-red-200 hover:bg-red-700 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                  >
                    {cancelling === appt._id ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                    ) : (
                      <>
                        Request Cancellation
                        {appt.consultationFee > 0 && (
                          <span className="text-[10px] opacity-80">(Refund eligibility checked)</span>
                        )}
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const STAT_THEME = {
  blue: { bg: "bg-blue-50", iconBg: "bg-blue-100   text-blue-600", val: "text-blue-700" },
  green: { bg: "bg-green-50", iconBg: "bg-green-100  text-green-600", val: "text-green-700" },
  amber: { bg: "bg-amber-50", iconBg: "bg-amber-100  text-amber-600", val: "text-amber-700" },
  purple: { bg: "bg-purple-50", iconBg: "bg-purple-100 text-purple-600", val: "text-purple-700" },
};

function StatCard({ label, value, icon, color, loading }) {
  const c = STAT_THEME[color] || STAT_THEME.blue;
  return (
    <div className={`${c.bg} rounded-2xl p-5 flex items-center gap-4 border border-white shadow-sm`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${c.iconBg}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-medium text-gray-500 mb-0.5">{label}</p>
        {loading
          ? <div className="h-7 w-10 bg-white/60 rounded animate-pulse mt-0.5" />
          : <p className={`text-2xl font-bold ${c.val}`}>{value ?? 0}</p>
        }
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN DASHBOARD PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientDashboard() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [selectedAppt, setSelectedAppt] = useState(null);
  const [error, setError] = useState("");

  // Bootstrap user from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      const tok = localStorage.getItem("token");
      if (!tok) { router.replace("/login"); return; }
      if (raw) setUser(JSON.parse(raw));
    } catch (_) { router.replace("/login"); }
  }, [router]);

  // Fetch appointments (including cancellation_requested)
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [upRes, pastRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/appointments/patient/upcoming`, { headers: authHeaders() }),
        axios.get(`${API_BASE}/appointments/patient/past`, { headers: authHeaders() }),
      ]);

      let all = [];
      if (upRes.status === "fulfilled") {
        const upcomingData = upRes.value.data.appointments || upRes.value.data || [];
        all = [...all, ...upcomingData];
      }
      if (pastRes.status === "fulfilled") {
        const pastData = pastRes.value.data.appointments || pastRes.value.data || [];
        all = [...all, ...pastData];
      }

      // Filter: Show confirmed, completed, or cancellation_requested
      const validAppointments = all.filter(a =>
        a.status === "confirmed" || a.status === "completed" || a.status === "cancellation_requested"
      );

      validAppointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setAppointments(validAppointments);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Unable to load appointments. Please refresh.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // Cancel appointment with refund calculation
  const handleCancel = async (id, reason) => {
    setCancelling(id);
    try {
      const response = await axios.put(`${API_BASE}/appointments/${id}/cancel`, { reason }, { headers: authHeaders() });

      // Show appropriate message based on refund eligibility
      if (response.data.refundAmount > 0) {
        alert(`Cancellation request submitted!\n\nRefund Amount: Rs. ${response.data.refundAmount} (${response.data.refundPercentage}%)\n\nYour request has been sent to admin for approval. You will receive the refund within 3-5 business days after approval.`);
      } else {
        alert(`Appointment cancelled successfully.\n\nNo refund applicable for this cancellation.`);
      }

      await fetchAppointments();
      setSelectedAppt(null);
    } catch (err) {
      const errorMessage = err.response?.data?.message || "Failed to cancel. Please try again.";
      setError(errorMessage);
      alert(errorMessage);
    } finally {
      setCancelling(null);
    }
  };

  // Split appointments into upcoming and past
  const now = new Date();
  const upcoming = appointments.filter(a => {
    const aptDate = new Date(a.dateTime);
    return aptDate >= now && a.status !== "cancelled" && a.status !== "rejected" && a.status !== "cancellation_requested";
  }).sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

  const past = appointments.filter(a => {
    const aptDate = new Date(a.dateTime);
    return aptDate < now || a.status === "cancelled" || a.status === "rejected" || a.status === "cancellation_requested";
  }).sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));

  const firstName = user?.name?.split(" ")[0] || "there";
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  // Stats
  const todayCount = upcoming.filter((a) => {
    const d = new Date(a.dateTime);
    return d.toDateString() === now.toDateString();
  }).length;

  const totalUpcoming = upcoming.length;
  const totalCompleted = past.filter(a => a.status === "completed").length;
  const pendingCancellations = appointments.filter(a => a.status === "cancellation_requested").length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/20">

      <AppointmentDetailModal
        open={!!selectedAppt}
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onCancel={handleCancel}
        cancelling={cancelling}
      />

      {/* Hero header */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 px-4 sm:px-6 pt-10 pb-28 relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full bg-white/5 blur-2xl" />
        <div className="absolute bottom-0 left-10 w-32 h-32 rounded-full bg-cyan-400/10 blur-xl" />

        <div className="relative max-w-5xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-blue-300 text-xs font-semibold uppercase tracking-widest mb-1">{today}</p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">
              Hello, {firstName}! 👋
            </h1>
            <p className="text-blue-200 text-sm mt-1.5">
              {totalUpcoming > 0
                ? `You have ${totalUpcoming} confirmed appointment${totalUpcoming !== 1 ? "s" : ""}`
                : "No appointments scheduled — book one today"
              }
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={fetchAppointments} disabled={loading}
              className="p-2.5 rounded-xl bg-white/20 hover:bg-white/30 text-white transition-colors" title="Refresh">
              <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <Link href="/doctors"
              className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-blue-600 text-sm font-bold
                hover:bg-blue-50 shadow-lg shadow-blue-900/20 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Book Appointment
            </Link>
          </div>
        </div>
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 -mt-16 pb-12 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard loading={loading} label="Confirmed" value={totalUpcoming} color="blue"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatCard loading={loading} label="Today" value={todayCount} color="green"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard loading={loading} label="Completed" value={totalCompleted} color="purple"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard loading={loading} label="Total" value={appointments.length} color="amber"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
          />
          <StatCard loading={loading} label="Pending Cancellations" value={pendingCancellations} color="amber"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            {error}
            <button onClick={fetchAppointments} className="ml-auto text-xs underline font-semibold">Retry</button>
          </div>
        )}

        {/* Pending Cancellations Alert */}
        {pendingCancellations > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-bold text-amber-800">Cancellation Request Pending</p>
                <p className="text-xs text-amber-700">
                  You have {pendingCancellations} cancellation request{pendingCancellations !== 1 ? "s" : ""} awaiting admin approval.
                  Refunds will be processed within 3-5 business days.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Appointments Section */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-50/40">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Upcoming Appointments
                {totalUpcoming > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {totalUpcoming}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Confirmed & paid appointments</p>
            </div>
            <Link href="/appointments"
              className="text-xs text-blue-600 font-bold hover:underline">
              View All →
            </Link>
          </div>
          <div className="p-4 space-y-3 max-h-[400px] overflow-y-auto">
            {loading ? (
              [1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 w-32 bg-gray-200 rounded" />
                    <div className="h-2.5 w-48 bg-gray-100 rounded" />
                  </div>
                </div>
              ))
            ) : upcoming.length === 0 ? (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-3">📅</div>
                <p className="text-sm font-semibold text-gray-700">No upcoming appointments</p>
                <p className="text-xs text-gray-400 mt-1">Book a paid appointment to get started</p>
                <Link href="/doctors" className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
                  Find a Doctor →
                </Link>
              </div>
            ) : (
              upcoming.slice(0, 5).map((appt) => (
                <AppointmentCard key={appt._id} appt={appt} onClick={setSelectedAppt} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h2 className="text-sm font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Find a Doctor", href: "/doctors", emoji: "🔍", from: "from-blue-50", to: "to-blue-100", border: "border-blue-200", hover: "hover:border-blue-300" },
              { label: "My Appointments", href: "/appointments", emoji: "📅", from: "from-green-50", to: "to-green-100", border: "border-green-200", hover: "hover:border-green-300" },
              { label: "My Profile", href: "/dashboard/profile", emoji: "👤", from: "from-purple-50", to: "to-purple-100", border: "border-purple-200", hover: "hover:border-purple-300" },
              { label: "Medical Records", href: "/dashboard/reports", emoji: "📋", from: "from-amber-50", to: "to-amber-100", border: "border-amber-200", hover: "hover:border-amber-300" },
            ].map(({ label, href, emoji, from, to, border, hover }) => (
              <Link key={label} href={href}
                className={`flex flex-col items-center justify-center gap-2.5 py-5 rounded-2xl
                  bg-gradient-to-b ${from} ${to} border ${border} ${hover}
                  transition-all hover:shadow-md hover:-translate-y-0.5 text-center`}>
                <span className="text-2xl">{emoji}</span>
                <span className="text-xs font-semibold text-gray-700 leading-tight">{label}</span>
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}