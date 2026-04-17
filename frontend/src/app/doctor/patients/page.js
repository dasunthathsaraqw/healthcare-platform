"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";
const PAGE_SIZE = 12;

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function calcAge(dob) {
  if (!dob) return null;
  return Math.floor((Date.now() - new Date(dob)) / (1000 * 60 * 60 * 24 * 365.25));
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatDateTime(rawDate) {
  if (!rawDate) return { date: "—", time: "—" };
  const d = new Date(rawDate);
  if (isNaN(d)) return { date: "—", time: "—" };
  return {
    date: d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" }),
    time: d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
  };
}

// ── Avatar color pool ─────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  "from-blue-500 to-cyan-400",
  "from-purple-500 to-pink-400",
  "from-green-500 to-teal-400",
  "from-orange-500 to-amber-400",
  "from-indigo-500 to-blue-400",
  "from-rose-500 to-pink-400",
];

function avatarColor(name = "") {
  const idx = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx] || AVATAR_COLORS[0];
}

// ─────────────────────────────────────────────────────────────────────────────
// METRIC CARD (for Health Metrics display)
// ─────────────────────────────────────────────────────────────────────────────

function MetricCard({ type, entries }) {
  if (!entries || entries.length === 0) return null;

  const latest = entries[0];
  const typeLabels = {
    blood_pressure: { label: "Blood Pressure", unit: "mmHg", icon: "❤️" },
    weight: { label: "Weight", unit: "kg", icon: "⚖️" },
    heart_rate: { label: "Heart Rate", unit: "bpm", icon: "💓" },
    temperature: { label: "Temperature", unit: "°C", icon: "🌡️" },
    blood_sugar: { label: "Blood Sugar", unit: "mg/dL", icon: "🩸" },
    oxygen_saturation: { label: "Oxygen Saturation", unit: "%", icon: "💨" },
  };

  const config = typeLabels[type] || { label: type, unit: "", icon: "📊" };

  const formatValue = () => {
    if (type === "blood_pressure" && latest.value) {
      if (typeof latest.value === "object") {
        return `${latest.value.systolic || latest.value.systolicBP}/${latest.value.diastolic || latest.value.diastolicBP}`;
      }
      return latest.value;
    }
    return latest.value;
  };

  const getStatusColor = () => {
    if (type === "blood_pressure") {
      const systolic = latest.value?.systolic || latest.value?.systolicBP;
      const diastolic = latest.value?.diastolic || latest.value?.diastolicBP;
      if (!systolic || !diastolic) return "text-gray-600";
      if (systolic < 120 && diastolic < 80) return "text-green-600";
      if (systolic >= 140 || diastolic >= 90) return "text-red-600";
      return "text-amber-600";
    }
    if (type === "heart_rate") {
      const rate = latest.value;
      if (rate >= 60 && rate <= 100) return "text-green-600";
      return "text-amber-600";
    }
    if (type === "oxygen_saturation") {
      const sat = latest.value;
      if (sat >= 95) return "text-green-600";
      if (sat >= 90) return "text-amber-600";
      return "text-red-600";
    }
    return "text-gray-600";
  };

  const formattedDate = latest.recordedAt
    ? new Date(latest.recordedAt).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    })
    : "Recently";

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl border border-gray-200 p-4 hover:shadow-md transition-all duration-200">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{config.icon}</span>
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{config.label}</p>
            <p className="text-xs text-gray-400">{entries.length} reading{entries.length !== 1 ? "s" : ""}</p>
          </div>
        </div>
      </div>
      <div className="flex items-baseline gap-1 flex-wrap">
        <span className={`text-xl font-bold ${getStatusColor()}`}>{formatValue()}</span>
        <span className="text-xs text-gray-400">{config.unit}</span>
      </div>
      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-gray-100">
        <svg className="w-3 h-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-[10px] text-gray-400">{formattedDate}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT DETAILS MODAL (Enhanced with appointments, prescriptions, metrics, reports)
// ─────────────────────────────────────────────────────────────────────────────

function PatientModal({ open, onClose, patientId, patientName: propPatientName }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("info");
  const [err, setErr] = useState("");
  const [appointments, setAppointments] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);
  const [loadingPrescriptions, setLoadingPrescriptions] = useState(false);

  useEffect(() => {
    if (!open || !patientId) return;

    setData(null);
    setErr("");
    setTab("info");
    setLoading(true);
    setAppointments([]);
    setPrescriptions([]);

    // Fetch patient summary
    axios.get(`${API_BASE}/doctors/patients/${patientId}`, { headers: authHeaders() })
      .then(({ data: res }) => {
        setData(res);
        // Also fetch appointments for this patient
        fetchPatientAppointments(patientId);
        fetchPatientPrescriptions(patientId);
      })
      .catch((e) => setErr(e.response?.data?.message || "Failed to load patient"))
      .finally(() => setLoading(false));
  }, [open, patientId]);

  const fetchPatientAppointments = async (pid) => {
    setLoadingAppointments(true);
    try {
      const { data } = await axios.get(`${API_BASE}/appointments/patient/${pid}`, { headers: authHeaders() });
      setAppointments(data.appointments || data || []);
    } catch (err) {
      console.error("Failed to fetch appointments:", err);
    } finally {
      setLoadingAppointments(false);
    }
  };

  const fetchPatientPrescriptions = async (pid) => {
    setLoadingPrescriptions(true);
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/prescriptions/patient/${pid}`, { headers: authHeaders() });
      setPrescriptions(data.prescriptions || data || []);
    } catch (err) {
      console.error("Failed to fetch prescriptions:", err);
    } finally {
      setLoadingPrescriptions(false);
    }
  };

  if (!open || typeof window === "undefined") return null;

  const patient = data?.patient || {};
  const metricsGrouped = data?.metrics?.grouped || {};
  const recentReports = data?.reports?.recent || [];
  const age = calcAge(patient.dob || patient.dateOfBirth);
  const metricTypes = Object.keys(metricsGrouped);

  const TABS = [
    { id: "info", label: "Info" },
    { id: "history", label: "History" },
    { id: "metrics", label: `Metrics (${data?.metrics?.count ?? 0})` },
    { id: "appointments", label: `Appointments (${appointments.length})` },
    { id: "prescriptions", label: `Rx (${prescriptions.length})` },
    { id: "reports", label: `Reports (${data?.reports?.count ?? 0})` },
  ];

  const handleStartConsultation = (appointmentId) => {
    onClose();
    router.push(`/doctor/consultation/${appointmentId}`);
  };

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_.2s_ease-out]">
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r ${avatarColor(patient.name)} shrink-0`}>
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center text-white font-bold text-lg shrink-0">
            {getInitials(patient.name || "P")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold text-white truncate">{patient.name || "Patient"}</p>
            <p className="text-xs text-white/80">{patient.email || ""}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/20 text-white transition-colors shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Inner tabs */}
        <div className="flex border-b border-gray-100 shrink-0 bg-white overflow-x-auto px-2 pt-1 gap-0.5">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors
                ${tab === t.id ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && <div className="space-y-3 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}</div>}
          {err && <p className="text-sm text-red-500 text-center py-10">{err}</p>}
          {!loading && !err && (
            <>
              {/* Basic Info Tab */}
              {tab === "info" && (
                <dl className="space-y-0 divide-y divide-gray-100">
                  {[
                    ["Full Name", patient.name],
                    ["Email", patient.email],
                    ["Phone", patient.phone],
                    ["Age", age ? `${age} years` : null],
                    ["Date of Birth", patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : null],
                    ["Gender", patient.gender],
                    ["Blood Group", patient.bloodGroup || patient.bloodType],
                    ["Address", patient.address],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-3 py-2.5">
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">{label}</dt>
                      <dd className="text-sm text-gray-800">{val}</dd>
                    </div>
                  ) : null)}
                </dl>
              )}

              {/* Medical History Tab */}
              {tab === "history" && (
                <div className="space-y-3">
                  {(patient.medicalHistory || []).length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No medical history recorded</p>
                  ) : (
                    patient.medicalHistory.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-800">
                        <span className="text-blue-400 shrink-0">•</span>
                        {typeof h === "string" ? h : h.condition || h.name || JSON.stringify(h)}
                      </div>
                    ))
                  )}
                  {(patient.allergies || []).length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-2">⚠ Allergies</p>
                      <div className="flex flex-wrap gap-1.5">
                        {patient.allergies.map((a, i) => <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-md">{a}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Health Metrics Tab */}
              {tab === "metrics" && (
                <div className="space-y-4">
                  {metricTypes.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No health metrics recorded</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {metricTypes.map((type) => (
                        <MetricCard key={type} type={type} entries={metricsGrouped[type]} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Appointments Tab */}
              {tab === "appointments" && (
                <div className="space-y-3">
                  {loadingAppointments ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-gray-100 rounded-xl" />)}
                    </div>
                  ) : appointments.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No appointments found</p>
                  ) : (
                    appointments.map((apt) => {
                      const { date, time } = formatDateTime(apt.dateTime || apt.date);
                      return (
                        <div key={apt._id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{date}</p>
                              <p className="text-xs text-gray-500">{time}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border
                                ${apt.status === "completed" ? "bg-green-50 text-green-600 border-green-200" :
                                  apt.status === "confirmed" ? "bg-blue-50 text-blue-600 border-blue-200" :
                                    apt.status === "pending" ? "bg-amber-50 text-amber-600 border-amber-200" :
                                      "bg-gray-50 text-gray-500 border-gray-200"}`}>
                                {apt.status}
                              </span>
                              {apt.status === "confirmed" && (
                                <button
                                  onClick={() => handleStartConsultation(apt._id)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-bold hover:bg-blue-700 transition-colors"
                                >
                                  Start
                                </button>
                              )}
                            </div>
                          </div>
                          {apt.reason && (
                            <p className="text-xs text-gray-600 mt-2">{apt.reason}</p>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Prescriptions Tab */}
              {tab === "prescriptions" && (
                <div className="space-y-3">
                  {loadingPrescriptions ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
                    </div>
                  ) : prescriptions.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No prescriptions issued yet</p>
                  ) : (
                    prescriptions.map((rx) => (
                      <div key={rx._id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div className="flex items-start justify-between flex-wrap gap-2">
                            <div>
                              <p className="text-sm font-semibold text-gray-900">{rx.diagnosis}</p>
                              <p className="text-xs text-gray-400 mt-0.5">{fmtDate(rx.issuedAt)}</p>
                            </div>
                            {rx.followUpDate && (
                              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">
                                Follow-up: {fmtDate(rx.followUpDate)}
                              </span>
                            )}
                          </div>
                        </div>
                        <ul className="divide-y divide-gray-100">
                          {(rx.medications || []).slice(0, 3).map((m, i) => (
                            <li key={i} className="px-4 py-2 flex items-start gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{m.name}</p>
                                <p className="text-xs text-gray-400">{m.dosage} · {m.frequency}</p>
                              </div>
                            </li>
                          ))}
                          {(rx.medications || []).length > 3 && (
                            <li className="px-4 py-2 text-xs text-gray-400">
                              +{(rx.medications || []).length - 3} more medication(s)
                            </li>
                          )}
                        </ul>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Reports Tab */}
              {tab === "reports" && (
                <div>
                  {recentReports.length === 0 ? (
                    <p className="text-sm text-gray-400 text-center py-8">No reports uploaded</p>
                  ) : (
                    <ul className="space-y-2">
                      {recentReports.map((r, i) => (
                        <li key={i} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-800">{r.title || r.name || `Report ${i + 1}`}</p>
                              <p className="text-xs text-gray-400">{fmtDate(r.createdAt)}</p>
                            </div>
                          </div>
                          {r.fileUrl && (
                            <a href={r.fileUrl} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 font-semibold hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50">
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
// PATIENT CARD (grid)
// ─────────────────────────────────────────────────────────────────────────────

function PatientCard({ patient, onView }) {
  const name = patient.name || "Unknown";
  const lastAppointment = patient.lastAppointment ? fmtDate(patient.lastAppointment) : "—";

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all duration-200 p-5 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
          {getInitials(name)}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900 truncate">{name}</p>
          <p className="text-xs text-gray-400 truncate">{patient.email || "—"}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="bg-blue-50 rounded-xl px-3 py-2 text-center">
          <p className="text-lg font-bold text-blue-600">{patient.appointmentCount || 0}</p>
          <p className="text-[10px] text-blue-400 font-medium">Total Visits</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
          <p className="text-xs font-bold text-gray-700">{lastAppointment}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Last Visit</p>
        </div>
      </div>

      <button onClick={() => onView(patient._id, name)}
        className="w-full py-2 rounded-xl border border-blue-200 text-blue-600 text-xs font-bold
          hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
        View Full Profile
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROW (list)
// ─────────────────────────────────────────────────────────────────────────────

function PatientRow({ patient, onView }) {
  const name = patient.name || "Unknown";
  const lastAppointment = patient.lastAppointment ? fmtDate(patient.lastAppointment) : "—";

  return (
    <div className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
      <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
        {getInitials(name)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{name}</p>
        <p className="text-xs text-gray-400 truncate">{patient.email || "—"}</p>
      </div>
      <div className="text-center w-20 hidden sm:block">
        <p className="text-sm font-bold text-blue-600">{patient.appointmentCount || 0}</p>
        <p className="text-[10px] text-gray-400">Visits</p>
      </div>
      <div className="text-right hidden md:block w-32">
        <p className="text-xs font-medium text-gray-700">{lastAppointment}</p>
        <p className="text-[10px] text-gray-400">Last visit</p>
      </div>
      <button onClick={() => onView(patient._id, name)}
        className="px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-xs font-bold
          hover:bg-blue-50 transition-colors shrink-0">
        View
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATION
// ─────────────────────────────────────────────────────────────────────────────

function Pagination({ page, total, pageSize, onChange }) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs">
        ‹
      </button>
      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        let pageNum;
        if (totalPages <= 7) {
          pageNum = i + 1;
        } else if (page <= 4) {
          pageNum = i + 1;
          if (i === 6) pageNum = totalPages;
        } else if (page >= totalPages - 3) {
          pageNum = totalPages - (6 - i);
        } else {
          const pages = [1, '...', page - 1, page, page + 1, '...', totalPages];
          if (i === 0) pageNum = pages[0];
          else if (i === 1) pageNum = pages[1];
          else if (i === 2) pageNum = pages[2];
          else if (i === 3) pageNum = pages[3];
          else if (i === 4) pageNum = pages[4];
          else if (i === 5) pageNum = pages[5];
          else pageNum = pages[6];
        }

        if (pageNum === '...') {
          return <span key={i} className="w-8 h-8 flex items-center justify-center text-gray-400">...</span>;
        }

        return (
          <button key={pageNum} onClick={() => onChange(pageNum)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors
              ${pageNum === page ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {pageNum}
          </button>
        );
      })}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs">
        ›
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SKELETON CARD
// ─────────────────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3.5 w-32 bg-gray-200 rounded" />
          <div className="h-2.5 w-48 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="h-14 bg-gray-100 rounded-xl" />
        <div className="h-14 bg-gray-100 rounded-xl" />
      </div>
      <div className="h-8 bg-gray-100 rounded-xl" />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewMode, setViewMode] = useState("grid");
  const [page, setPage] = useState(1);
  const [patientId, setPatientId] = useState(null);
  const [patientName, setPatientName] = useState("");
  const debounceRef = useRef(null);

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/patients`, { headers: authHeaders() });
      setPatients(data.patients || data || []);
    } catch (err) {
      console.error("Patients fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // Client-side filter
  const filtered = patients.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const last = p.lastAppointment ? new Date(p.lastAppointment) : null;
    const matchFrom = !fromDate || (last && last >= new Date(fromDate));
    const matchTo = !toDate || (last && last <= new Date(toDate + "T23:59:59"));
    return matchSearch && matchFrom && matchTo;
  });

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 300);
  };

  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); };

  const handleViewPatient = (id, name) => {
    setPatientId(id);
    setPatientName(name);
  };

  return (
    <>
      <PatientModal open={!!patientId} patientId={patientId} patientName={patientName} onClose={() => setPatientId(null)} />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Patients</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${filtered.length} patient${filtered.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          {/* View toggle */}
          <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-xl">
            {[
              { id: "grid", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /> },
              { id: "list", icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /> },
            ].map(({ id, icon }) => (
              <button key={id} onClick={() => setViewMode(id)}
                className={`p-2 rounded-lg transition-all ${viewMode === id ? "bg-white shadow text-blue-600" : "text-gray-400 hover:text-gray-600"}`}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path {...{ strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2 }}>{icon}</path></svg>
              </button>
            ))}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">FROM</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="pl-14 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">TO</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          {(search || fromDate || toDate) && (
            <button onClick={clearFilters}
              className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors">
              Clear ✕
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className={viewMode === "grid"
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
            : "space-y-2"
          }>
            {Array.from({ length: 8 }).map((_, i) =>
              viewMode === "grid" ? <SkeletonCard key={i} /> :
                <div key={i} className="h-16 bg-white border border-gray-100 rounded-xl animate-pulse" />
            )}
          </div>
        ) : paginated.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-4">👥</div>
            <p className="text-sm font-semibold text-gray-700">No patients found</p>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
          </div>
        ) : viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginated.map((p) => <PatientCard key={p._id} patient={p} onView={handleViewPatient} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              <div className="col-span-2">Patient</div>
              <div className="hidden sm:block text-center">Visits</div>
              <div className="hidden md:block text-right">Last Visit</div>
            </div>
            {paginated.map((p) => <PatientRow key={p._id} patient={p} onView={handleViewPatient} />)}
          </div>
        )}

        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE}
          onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}