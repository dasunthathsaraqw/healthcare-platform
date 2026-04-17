"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_APPOINTMENT_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${token}` };
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────

const TABS = [
  { id: "pending", label: "Pending", badge: true },
  { id: "today", label: "Today", badge: false },
  { id: "upcoming", label: "Upcoming", badge: false },
  { id: "past", label: "Past", badge: false },
  { id: "all", label: "All", badge: false },
];

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", dot: "bg-amber-400" },
  confirmed: { label: "Confirmed", bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", dot: "bg-blue-500" },
  completed: { label: "Completed", bg: "bg-green-50", text: "text-green-700", border: "border-green-200", dot: "bg-green-500" },
  cancelled: { label: "Cancelled", bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", dot: "bg-gray-400" },
  rejected: { label: "Rejected", bg: "bg-red-50", text: "text-red-600", border: "border-red-200", dot: "bg-red-500" },
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function formatDateTime(rawDate) {
  if (!rawDate) return { date: "—", time: "—" };
  const d = new Date(rawDate);
  if (isNaN(d)) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

function calcAge(dob) {
  if (!dob) return null;
  const diff = Date.now() - new Date(dob).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Returns true if current time is within 15 min before or after appointmentDate */
function isWithinWindow(rawDate, windowMins = 15) {
  if (!rawDate) return false;
  const appt = new Date(rawDate).getTime();
  const now = Date.now();
  const diff = (appt - now) / 60000; // minutes
  return diff >= -windowMins && diff <= windowMins;
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// TOAST CONTAINER
// ─────────────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Don't render anything on server or before mount
  if (!mounted) return null;

  return createPortal(
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
            animate-[slideUp_0.2s_ease-out]
            ${t.type === "success" ? "bg-green-600 text-white"
              : t.type === "error" ? "bg-red-600 text-white"
                : "bg-gray-900 text-white"}`}
        >
          {t.type === "success" && (
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          )}
          {t.type === "error" && (
            <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          )}
          <span>{t.message}</span>
          <button
            onClick={() => removeToast(t.id)}
            className="ml-1 opacity-70 hover:opacity-100"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({ open, onClose, onConfirm, loading }) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [err, setErr] = useState("");
  const textRef = useRef(null);

  // Mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Reset form when modal opens
  useEffect(() => {
    if (open && mounted) {
      setReason("");
      setErr("");
      setTimeout(() => textRef.current?.focus(), 80);
    }
  }, [open, mounted]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setErr("Please provide a rejection reason.");
      return;
    }
    onConfirm(reason.trim());
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-red-50">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h2 className="text-base font-bold text-gray-900">Reject Appointment</h2>
            <p className="text-xs text-gray-500">Please give a reason for the patient</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-red-100 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1.5">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              ref={textRef}
              rows={4}
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setErr("");
              }}
              placeholder="e.g. Schedule conflict, please rebook for next week…"
              className={`w-full px-4 py-3 rounded-xl border text-sm text-gray-800 placeholder-gray-400 resize-none
                focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent bg-gray-50 transition
                ${err ? "border-red-300" : "border-gray-200"}`}
            />
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold
                disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-red-200 transition-colors"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Rejecting…
                </>
              ) : (
                "Reject Appointment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT DETAILS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PatientModal({ open, onClose, patientId }) {
  const [mounted, setMounted] = useState(false);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [innerTab, setInnerTab] = useState("info");
  const [error, setError] = useState("");

  // Mount detection
  useEffect(() => {
    setMounted(true);
  }, []);

  // Fetch patient data when modal opens
  useEffect(() => {
    if (!open || !patientId || !mounted) return;

    setInnerTab("info");
    setError("");
    setData(null);
    setLoading(true);

    axios
      .get(`${API_BASE}/patients/doctor/patient/${patientId}/summary`, { headers: authHeaders() })
      .then(({ data: res }) => setData(res))
      .catch((err) => setError(err.response?.data?.message || "Failed to load patient data"))
      .finally(() => setLoading(false));
  }, [open, patientId, mounted]);

  if (!open || !mounted) return null;

  const patient = data?.patient || {};
  const metricsGrouped = data?.metrics?.grouped || {};
  const recentReports = data?.reports?.recent || [];
  const age = calcAge(patient.dob || patient.dateOfBirth);
  const metricTypes = Object.keys(metricsGrouped);

  const INNER_TABS = [
    { id: "info", label: "Basic Info" },
    { id: "history", label: "Medical History" },
    { id: "metrics", label: `Health Metrics (${data?.metrics?.count ?? 0})` },
    { id: "reports", label: `Reports (${data?.reports?.count ?? 0})` },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out] flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold shrink-0">
            {getInitials(patient.name || "P")}
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{patient.name || "Patient Details"}</h2>
            <p className="text-xs text-gray-500">{patient.email || ""}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Inner tabs */}
        <div className="flex border-b border-gray-100 shrink-0 px-2 pt-1 gap-1 bg-white overflow-x-auto">
          {INNER_TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setInnerTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
                ${innerTab === t.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 p-6">
          {loading && (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}
            </div>
          )}

          {error && (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.072 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700 mb-1">Failed to Load Patient Data</p>
              <p className="text-xs text-red-500">{error}</p>
            </div>
          )}



          {!loading && !error && (
            <>
              {/* ── Basic Info ─────────────────────────────────────────────── */}
              {innerTab === "info" && (
                <div className="space-y-3">
                  {[
                    { label: "Full Name", value: patient.name },
                    { label: "Email", value: patient.email },
                    { label: "Phone", value: patient.phone },
                    { label: "Age", value: age ? `${age} years` : null },
                    { label: "Date of Birth", value: patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : null },
                    { label: "Gender", value: patient.gender },
                    { label: "Blood Group", value: patient.bloodGroup || patient.bloodType },
                    { label: "City", value: patient.address?.city },
                    { label: "Country", value: patient.address?.country },
                    { label: "Emergency Contact", value: patient.emergencyContact },
                  ].map(({ label, value }) => value ? (
                    <div key={label} className="flex gap-3 py-2.5 border-b border-gray-100 last:border-0">
                      <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-36 shrink-0">{label}</span>
                      <span className="text-sm text-gray-800">{value}</span>
                    </div>
                  ) : null)}
                  {!patient.name && <EmptyState icon="👤" title="No patient data available" subtitle="Patient profile could not be loaded" />}
                </div>
              )}

              {/* ── Medical History ─────────────────────────────────────────── */}
              {innerTab === "history" && (
                <div>
                  {(patient.medicalHistory || []).length === 0 ? (
                    <EmptyState icon="📋" title="No medical history" subtitle="No conditions or history recorded" />
                  ) : (
                    <ul className="space-y-2">
                      {(patient.medicalHistory || []).map((item, i) => (
                        <li key={i}
                          className="flex items-start gap-3 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-800">
                          <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                          {typeof item === "string" ? item : item.condition || item.name || JSON.stringify(item)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {(patient.allergies || []).length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Allergies</p>
                      <div className="flex flex-wrap gap-2">
                        {patient.allergies.map((a, i) => (
                          <span key={i} className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 text-xs font-medium border border-red-100">{a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── Health Metrics ──────────────────────────────────────────── */}
              {innerTab === "metrics" && (
                <div className="space-y-4">
                  {metricTypes.length === 0 ? (
                    <EmptyState icon="📊" title="No health metrics recorded" subtitle="Patient has not logged any health data yet" />
                  ) : (
                    <>
                      {/* Latest reading cards */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {metricTypes.map((type) => (
                          <MetricCard key={type} type={type} entries={metricsGrouped[type]} />
                        ))}
                      </div>

                      {/* History list per type */}
                      {metricTypes.map((type) => {
                        const entries = metricsGrouped[type];
                        if (entries.length <= 1) return null;
                        const typeLabels = { blood_pressure: "Blood Pressure", weight: "Weight", heart_rate: "Heart Rate" };
                        return (
                          <div key={type}>
                            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{typeLabels[type] || type} — History</p>
                            <ul className="space-y-1.5">
                              {entries.slice(0, 10).map((entry) => (
                                <li key={entry._id} className="flex items-center justify-between px-4 py-2 bg-gray-50 rounded-xl border border-gray-100 text-xs">
                                  <span className="font-medium text-gray-800">
                                    {type === "blood_pressure"
                                      ? `${entry.value?.systolic}/${entry.value?.diastolic} ${entry.unit}`
                                      : `${entry.value} ${entry.unit}`}
                                  </span>
                                  <span className="text-gray-400">
                                    {new Date(entry.recordedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              )}

              {/* ── Medical Reports ─────────────────────────────────────────── */}
              {innerTab === "reports" && (
                <div>
                  {recentReports.length === 0 ? (
                    <EmptyState icon="📁" title="No reports uploaded" subtitle="Patient has no uploaded documents" />
                  ) : (
                    <ul className="space-y-2">
                      {recentReports.map((r, i) => (
                        <li key={r._id || i}
                          className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{r.title || r.name || `Report ${i + 1}`}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {r.documentType && (
                                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                    {r.documentType}
                                  </span>
                                )}
                                <span className="text-xs text-gray-400">
                                  {r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                                </span>
                                {r.uploadedBy && (
                                  <span className="text-[10px] text-gray-400">• by {r.uploadedBy}</span>
                                )}
                              </div>
                            </div>
                          </div>
                          {r.fileUrl && (
                            <a href={r.fileUrl} target="_blank" rel="noreferrer"
                              className="ml-3 shrink-0 text-xs text-blue-600 font-semibold hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                              View ↗
                            </a>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </div>

      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon = "📅", title = "No appointments found", subtitle = "" }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-4">{icon}</div>
      <p className="text-sm font-semibold text-gray-700 mb-1">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 max-w-xs">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// APPOINTMENT CARD
// ─────────────────────────────────────────────────────────────────────────────


function AppointmentCard({ appt, onAccept, onReject, onViewDetails, actionLoading, onStartConsultation }) {
  const status = appt.status || "pending";
  const sc = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  const { date, time } = formatDateTime(appt.dateTime || appt.date);
  const patientName = appt.patientName || appt.patientId?.name || "Unknown Patient";
  const inWindow = isWithinWindow(appt.dateTime || appt.date);
  const isActioning = actionLoading === appt._id;
  const isVideo = appt.meetingLink || appt.type === "video" || appt.appointmentType === "video";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Status bar */}
      <div className={`h-1 w-full ${sc.dot}`} />

      <div className="p-4 sm:p-5">
        {/* Top row: patient + status + type */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Avatar */}
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shrink-0 shadow-sm">
              {appt.patientId?.profilePicture ? (
                <img src={appt.patientId.profilePicture} alt={patientName} className="w-full h-full rounded-full object-cover" />
              ) : (
                getInitials(patientName)
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{patientName}</p>
              <p className="text-xs text-gray-400 truncate">{appt.patientId?.email || "—"}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Appointment type badge */}
            {(appt.type || appt.appointmentType) && (
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border
                ${(appt.type || appt.appointmentType) === "video"
                  ? "bg-purple-50 text-purple-600 border-purple-200"
                  : "bg-cyan-50 text-cyan-600 border-cyan-200"}`}>
                {appt.type === "video" || appt.appointmentType === "video" ? "🎥 Video" : "🏥 In-Person"}
              </span>
            )}
            {/* Status badge */}
            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${sc.bg} ${sc.text} ${sc.border}`}>
              <span className={`inline-block w-1.5 h-1.5 rounded-full ${sc.dot} mr-1`} />
              {sc.label}
            </span>
          </div>
        </div>

        {/* Date & Time */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <span className="font-medium">{date}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-600">
            <svg className="w-3.5 h-3.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{time}</span>
          </div>
        </div>

        {/* Reason */}
        {(appt.reason || appt.notes) && (
          <div className="mt-2.5 flex items-start gap-1.5">
            <svg className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
            </svg>
            <p className="text-xs text-gray-500 line-clamp-2">{appt.reason || appt.notes}</p>
          </div>
        )}

        {/* Rejection reason */}
        {status === "rejected" && appt.rejectionReason && (
          <div className="mt-2.5 px-3 py-2 bg-red-50 border border-red-100 rounded-xl">
            <p className="text-xs text-red-600"><span className="font-semibold">Rejection reason:</span> {appt.rejectionReason}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-gray-100">

          {/* Pending actions */}
          {status === "pending" && (
            <>
              <button onClick={() => onAccept(appt._id)} disabled={isActioning}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold
                  disabled:opacity-50 transition-colors shadow-sm shadow-blue-200 flex items-center gap-1.5">
                {isActioning
                  ? <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>
                  : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
                }
                Accept
              </button>
              <button onClick={() => onReject(appt)} disabled={isActioning}
                className="px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold
                  disabled:opacity-50 transition-colors flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                Reject
              </button>
            </>
          )}


          {/* Confirmed: start consultation (always show if confirmed + video) */}
          {status === "confirmed" && (
            <>
              {/* Start Consultation – glow when within 15 min window */}
              <button
                onClick={() => onStartConsultation(appt._id)}
                className={`px-4 py-2 rounded-xl text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5
                  ${inWindow
                    ? "bg-green-500 hover:bg-green-600 shadow-green-200 animate-pulse"
                    : "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                  }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                {inWindow ? "Start Now" : "Start Consultation"}
              </button>
            </>
          )}

          {/* Completed: view prescription */}
          {status === "completed" && (
            <button className="px-4 py-2 rounded-xl border border-green-200 text-green-600 hover:bg-green-50
              text-xs font-bold transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Prescription
            </button>
          )}

          {/* Delete (if past, completed, rejected, cancelled etc) */}
          {(status === "completed" || status === "cancelled" || status === "rejected") && (
            <button
              onClick={() => onDelete(appt._id)} disabled={isActioning}
              className="px-4 py-2 rounded-xl border border-red-200 text-red-500 hover:bg-red-50 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              Delete
            </button>
          )}

          {/* Always: view details */}
          <button
            onClick={() => onViewDetails(appt.patientId?._id || appt.patientId)}
            className="ml-auto px-4 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50
              hover:border-blue-200 hover:text-blue-600 text-xs font-bold transition-colors flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3 animate-pulse">
      <div className="h-1 w-full bg-gray-100 rounded" />
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3.5 w-36 bg-gray-200 rounded" />
          <div className="h-2.5 w-24 bg-gray-100 rounded" />
        </div>
        <div className="h-5 w-20 bg-gray-100 rounded-lg" />
      </div>
      <div className="flex gap-4 pt-2 border-t border-gray-100">
        <div className="h-3 w-32 bg-gray-100 rounded" />
        <div className="h-3 w-20 bg-gray-100 rounded" />
      </div>
      <div className="flex gap-2 pt-2 border-t border-gray-100">
        <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        <div className="h-8 w-20 bg-gray-100 rounded-xl" />
        <div className="h-8 w-24 bg-gray-100 rounded-xl ml-auto" />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AppointmentsPage() {

  const router = useRouter();
  const [activeTab, setActiveTab] = useState("pending");
  const [appointments, setAppointments] = useState([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modals
  const [rejectTarget, setRejectTarget] = useState(null); // appointment object
  const [rejectLoading, setRejectLoading] = useState(false);
  const [patientId, setPatientId] = useState(null);

  // Action loading
  const [actionLoading, setActionLoading] = useState(null);

  // Toasts
  const toastRef = useRef(0);
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  // ── Build query params per tab ─────────────────────────────────────────────
  const buildParams = useCallback((tab) => {
    switch (tab) {
      case "pending": return { status: "pending" };
      case "today": return { date: todayISO() };
      case "upcoming": return { status: "upcoming" };
      case "past": return { status: "past" };
      default: return {};
    }
  }, []);

  // ── Fetch appointments ─────────────────────────────────────────────────────
  const fetchAppointments = useCallback(async (tab, silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const { data } = await axios.get(`${API_BASE}/appointments/manage`, {
        headers: authHeaders(),
        params: buildParams(tab),
      });
      const list = data.appointments || data || [];
      setAppointments(list);
      if (tab === "pending") setPendingCount(list.length);
    } catch (err) {
      if (!silent) addToast(err.response?.data?.message || "Failed to load appointments", "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [buildParams, addToast]);

  // Fetch also pending count whenever tab changes (for badge)
  const fetchPendingCount = useCallback(async () => {
    try {
      const { data } = await axios.get(`${API_BASE}/appointments/manage`, {
        headers: authHeaders(),
        params: { status: "pending" },
      });
      setPendingCount((data.appointments || data || []).length);
    } catch (_) { }
  }, []);

  // Initial load + tab change
  useEffect(() => {
    fetchAppointments(activeTab);
    if (activeTab !== "pending") fetchPendingCount();
  }, [activeTab, fetchAppointments, fetchPendingCount]);

  // Auto-refresh every 30 seconds when on pending tab
  useEffect(() => {
    if (activeTab !== "pending") return;
    const interval = setInterval(() => {
      fetchAppointments("pending", true);
    }, 30_000);
    return () => clearInterval(interval);
  }, [activeTab, fetchAppointments]);

  // ── Accept ─────────────────────────────────────────────────────────────────
  const handleAccept = async (id) => {
    setActionLoading(id);
    try {
      await axios.put(`${API_BASE}/appointments/manage/${id}/status`, { status: "confirmed" }, { headers: authHeaders() });
      addToast("Appointment accepted!", "success");
      setAppointments((p) => p.filter((a) => a._id !== id));
      setPendingCount((n) => Math.max(0, n - 1));
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to accept", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleRejectConfirm = async (reason) => {
    if (!rejectTarget) return;
    setRejectLoading(true);
    try {
      await axios.put(`${API_BASE}/appointments/manage/${rejectTarget._id}/status`,
        { status: "rejected", reason },
        { headers: authHeaders() }
      );
      addToast("Appointment rejected.", "success");
      setAppointments((p) => p.filter((a) => a._id !== rejectTarget._id));
      setPendingCount((n) => Math.max(0, n - 1));
      setRejectTarget(null);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject", "error");
    } finally {
      setRejectLoading(false);
    }
  };

  // ── Delete Appointment ─────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this appointment?")) return;

    setActionLoading(id);
    try {
      await axios.delete(`${API_BASE}/appointments/manage/${id}`, {
        headers: authHeaders(),
      });

      addToast("Appointment deleted successfully", "success");
      setAppointments((prev) => prev.filter((a) => a._id !== id));
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete appointment", "error");
    } finally {
      setActionLoading(null);
    }
  };

  // ── Start Consultation ────────────────────────────────────────────────────
  const handleStartConsultation = (appointmentId) => {
    router.push(`/doctor/consultation/${appointmentId}`);
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <RejectModal
        open={!!rejectTarget}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleRejectConfirm}
        loading={rejectLoading}
      />
      <PatientModal
        open={!!patientId}
        patientId={patientId}
        onClose={() => setPatientId(null)}
      />

      <div className="max-w-4xl mx-auto space-y-6">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Appointments</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage patient appointments</p>
          </div>
          <button
            onClick={() => fetchAppointments(activeTab, true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200
              hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-600 hover:text-blue-600
              transition-all disabled:opacity-50"
          >
            <svg className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Auto-refresh notice on pending */}
        {activeTab === "pending" && (
          <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-700">
            <svg className="w-3.5 h-3.5 animate-pulse shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            Auto-refreshing every 30 seconds
          </div>
        )}

        {/* ── Tabs ───────────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? "border-blue-600 text-blue-600 bg-blue-50/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}
              >
                {tab.label}
                {tab.badge && pendingCount > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full
                    bg-amber-500 text-white text-[10px] font-bold">
                    {pendingCount > 99 ? "99+" : pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── Content ──────────────────────────────────────────────────── */}
          <div className="p-4 sm:p-5">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
              </div>
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={activeTab === "pending" ? "✅" : "📅"}
                title={activeTab === "pending" ? "All caught up!" : "No appointments found"}
                subtitle={
                  activeTab === "pending"
                    ? "No pending appointments requiring your action"
                    : "There are no appointments in this category"
                }
              />
            ) : (
              <div className="space-y-4">
                {/* Count label */}
                <p className="text-xs text-gray-400 font-medium">
                  {appointments.length} appointment{appointments.length !== 1 ? "s" : ""}
                </p>
                {appointments.map((appt) => (
                  <AppointmentCard
                    key={appt._id}
                    appt={appt}
                    onAccept={handleAccept}
                    onReject={setRejectTarget}
                    onDelete={handleDelete}
                    onViewDetails={(pid) => pid && setPatientId(pid)}
                    onStartConsultation={handleStartConsultation}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.96); }
          to   { opacity: 1; transform: scale(1);    }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0);   }
        }
        .line-clamp-2 {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }
      `}</style>
    </>
  );
}
