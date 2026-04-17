"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

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

  // Check if refund was processed
  const hasRefund = appt.status === "cancelled" && appt.refundProcessedAt;
  const isRejected = appt.status === "confirmed" && appt.refundRequested === true && !appt.refundProcessedAt;

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

        {/* Status badges */}
        {appt.refundAmount > 0 && appt.status === "cancellation_requested" && (
          <div className="mt-2 px-2 py-1 bg-amber-50 border border-amber-100 rounded-lg inline-block">
            <p className="text-[9px] text-amber-600">Refund requested: Rs. {appt.refundAmount}</p>
          </div>
        )}
        {hasRefund && (
          <div className="mt-2 px-2 py-1 bg-green-50 border border-green-100 rounded-lg inline-block">
            <p className="text-[9px] text-green-600">✓ Refund processed: Rs. {appt.refundAmount}</p>
          </div>
        )}
        {isRejected && (
          <div className="mt-2 px-2 py-1 bg-red-50 border border-red-100 rounded-lg inline-block">
            <p className="text-[9px] text-red-600">✗ Cancellation rejected</p>
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
  const [downloading, setDownloading] = useState(false);

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

  const handleJoinVideoConsultation = () => {
    const id = appt._id ?? appt.id;
    if (!id) return;
    onClose();
    router.push(`/dashboard/consultation/${id}`);
  };

  const handleDownloadReceipt = () => {
    setDownloading(true);
    try {
      const hasRefund = appt.status === "cancelled" && appt.refundProcessedAt;
      const isRejected = appt.status === "confirmed" && appt.refundRequested === true && !appt.refundProcessedAt;

      const printWindow = window.open('', '_blank');
      printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Appointment Receipt - ${appt._id}</title>
        <meta charset="UTF-8">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; padding: 40px; }
          .receipt { max-width: 800px; margin: 0 auto; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #2563eb, #06b6d4); color: white; padding: 30px; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { padding: 30px; }
          .section { margin-bottom: 24px; border-bottom: 1px solid #e5e7eb; padding-bottom: 16px; }
          .section-title { font-size: 16px; font-weight: bold; color: #2563eb; margin-bottom: 12px; }
          .row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
          .label { font-weight: 600; color: #6b7280; }
          .value { color: #111827; }
          .footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border-top: 1px solid #e5e7eb; }
          .print-button { text-align: center; margin-top: 20px; padding: 20px; }
          .print-button button { padding: 10px 24px; background: #2563eb; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; margin: 0 8px; }
          @media print { body { background: white; padding: 0; } .print-button { display: none; } }
        </style>
      </head>
      <body>
        <div class="receipt">
          <div class="header"><h1>🏥 Healthcare Appointment Receipt</h1><p>ID: ${appt._id?.slice(-12) || 'N/A'}</p></div>
          <div class="content">
            <div class="section"><div class="section-title">📋 Appointment Details</div>
              <div class="row"><span class="label">Doctor:</span><span class="value">${appt.doctorName || 'N/A'}</span></div>
              <div class="row"><span class="label">Specialty:</span><span class="value">${appt.specialty || 'N/A'}</span></div>
              <div class="row"><span class="label">Date:</span><span class="value">${fmtDate(dt)}</span></div>
              <div class="row"><span class="label">Time:</span><span class="value">${fmtTime(dt)}</span></div>
              <div class="row"><span class="label">Status:</span><span class="value">${STATUS_STYLES[appt.status]?.label || appt.status || 'Confirmed'}</span></div>
            </div>
            <div class="section"><div class="section-title">💰 Payment Information</div>
              <div class="row"><span class="label">Consultation Fee:</span><span class="value">Rs. ${appt.consultationFee?.toFixed(2) || '0.00'}</span></div>
              <div class="row"><span class="label">Payment Status:</span><span class="value">${appt.paymentStatus === 'paid' ? '✅ Paid' : 'Pending'}</span></div>
            </div>
          </div>
          <div class="footer"><p>Generated on: ${new Date().toLocaleString()}</p></div>
        </div>
        <div class="print-button"><button onclick="window.print()">📄 Save as PDF</button><button class="close-btn" onclick="window.close()">❌ Close</button></div>
        <script>setTimeout(() => { window.print(); }, 500);</script>
      </body>
      </html>
    `);
      printWindow.document.close();
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const hasRefund = appt.status === "cancelled" && appt.refundProcessedAt;
  const isRejected = appt.status === "confirmed" && appt.refundRequested === true && !appt.refundProcessedAt;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
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

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
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
            </div>
          </div>

          {appt.consultationFee > 0 && (
            <div className="flex items-center justify-between p-4 bg-green-50 rounded-xl border border-green-100">
              <span className="text-sm font-semibold text-gray-700">Amount Paid</span>
              <span className="text-lg font-bold text-green-600">Rs. {appt.consultationFee.toFixed(2)}</span>
            </div>
          )}

          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Reason for Visit
            </h3>
            <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
              <p className="text-sm text-slate-600 leading-relaxed italic">{appt.reason || "No specific reason provided."}</p>
            </div>
          </div>

          <div className="space-y-3 pt-2">
            <button onClick={handleDownloadReceipt} disabled={downloading}
              className="w-full py-3 rounded-2xl border-2 border-blue-200 text-blue-600 font-bold text-sm hover:bg-blue-50 transition-all flex items-center justify-center gap-2">
              {downloading ? (<svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>) : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>Download Receipt</>)}
            </button>

            {status === "confirmed" && (
              <button onClick={handleJoinVideoConsultation} className="w-full py-4 rounded-2xl bg-blue-600 text-white font-black text-sm shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center justify-center gap-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
                Join Video Consultation
              </button>
            )}

            <div className="flex gap-3">
              {(status === "confirmed") && (
                <button onClick={() => setCancelStep("confirm")} className="flex-1 py-3.5 rounded-2xl border-2 border-slate-100 text-slate-400 text-xs font-bold hover:bg-red-50 hover:border-red-100 hover:text-red-500 transition-all flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  Cancel Appointment
                </button>
              )}
              <button onClick={onClose} className="flex-1 py-3.5 rounded-2xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all">Close</button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const STAT_THEME = {
  blue: { bg: "bg-blue-50", iconBg: "bg-blue-100 text-blue-600", val: "text-blue-700" },
  green: { bg: "bg-green-50", iconBg: "bg-green-100 text-green-600", val: "text-green-700" },
  amber: { bg: "bg-amber-50", iconBg: "bg-amber-100 text-amber-600", val: "text-amber-700" },
  purple: { bg: "bg-purple-50", iconBg: "bg-purple-100 text-purple-600", val: "text-purple-700" },
  cyan: { bg: "bg-cyan-50", iconBg: "bg-cyan-100 text-cyan-600", val: "text-cyan-700" },
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
// FEATURE CARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

function FeatureCard({ emoji, title, description, color }) {
  const colors = {
    blue: "from-blue-50 to-blue-100 border-blue-200 text-blue-600",
    green: "from-green-50 to-green-100 border-green-200 text-green-600",
    purple: "from-purple-50 to-purple-100 border-purple-200 text-purple-600",
    orange: "from-orange-50 to-orange-100 border-orange-200 text-orange-600",
  };
  const gradient = colors[color] || colors.blue;
  
  return (
    <div className={`bg-gradient-to-br ${gradient} rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md hover:-translate-y-1`}>
      <div className="text-3xl mb-3">{emoji}</div>
      <h3 className="text-sm font-bold text-gray-800 mb-1">{title}</h3>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
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

  // Fetch appointments (including cancellation_requested) - SAME AS APPOINTMENTS PAGE
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

      // Show ALL appointments (confirmed, completed, cancelled, cancellation_requested)
      // Same filtering as appointments page
      const allAppointments = all.filter(a =>
        a.status === "confirmed" || a.status === "completed" || a.status === "cancelled" || a.status === "cancellation_requested"
      );

      allAppointments.sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
      setAppointments(allAppointments);
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

      if (response.data.refundAmount > 0) {
        alert(`Cancellation request submitted!\n\nRefund Amount: Rs. ${response.data.refundAmount}\n\nYour request has been sent to admin for approval.`);
      } else {
        alert(`Appointment cancelled successfully.\n\nNo refund applicable.`);
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

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart);
  todayEnd.setDate(todayEnd.getDate() + 1);

  // FIXED: Upcoming appointments - confirmed and not cancelled/rejected, future dates
const upcoming = appointments
  .filter(a => new Date(a.dateTime) >= now && a.status !== "cancelled" && a.status !== "rejected")
  .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

const todayAppointments = appointments
  .filter(a => {
    const aptDate = new Date(a.dateTime);
    return aptDate >= todayStart && aptDate < todayEnd && a.status !== "cancelled" && a.status !== "rejected";
  })
  .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));

const past = appointments
  .filter(a => new Date(a.dateTime) < now || a.status === "cancelled" || a.status === "rejected" || a.status === "cancellation_requested" || a.status === "completed")
  .sort((a, b) => new Date(b.dateTime) - new Date(a.dateTime));
  // FIXED: Pending cancellations - cancellation_requested status
  const pendingCancellations = appointments.filter(a => a.status === "cancellation_requested").length;

  // FIXED: Refunds processed - cancelled with refundProcessedAt
  const totalRefunded = appointments.filter(a => a.status === "cancelled" && a.refundProcessedAt).length;

  const firstName = user?.name?.split(" ")[0] || "there";
  const today = now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50/50 to-blue-50/20">

      <AppointmentDetailModal
        open={!!selectedAppt}
        appt={selectedAppt}
        onClose={() => setSelectedAppt(null)}
        onCancel={handleCancel}
        cancelling={cancelling}
      />

      {/* Hero Section - Booking Focused */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800">
        <div className="absolute inset-0 opacity-30">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        </div>

        <div className="relative px-4 sm:px-6 pt-12 pb-20">
          <div className="max-w-5xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 mb-6">
              <span className="text-yellow-300 text-sm">👋</span>
              <span className="text-white/90 text-sm font-medium">Welcome back, {firstName}!</span>
              <span className="text-white/60 text-xs">{today}</span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-4 leading-tight">
              Your Health, <span className="text-cyan-300">Our Priority</span>
            </h1>
            <p className="text-blue-100 text-base sm:text-lg mb-8 max-w-2xl mx-auto">
              Book appointments with top doctors in minutes. Video consultation available from the comfort of your home.
            </p>

            <div className="max-w-2xl mx-auto mb-6">
              <div className="bg-white rounded-2xl p-1.5 shadow-2xl flex flex-col sm:flex-row gap-2">
                <div className="flex-1 relative">
                  <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by doctor name, specialty..."
                    className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === "Enter" && router.push("/dashboard/doctors")}
                  />
                </div>
                <button
                  onClick={() => router.push("/dashboard/doctors")}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold hover:from-blue-700 hover:to-cyan-600 transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  Find Doctors
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-4 text-blue-100 text-sm">
              <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Verified Doctors</span></div>
              <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg><span>Secure Payments</span></div>
              <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg><span>Instant Confirmation</span></div>
              <div className="flex items-center gap-1.5"><svg className="w-4 h-4 text-green-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636L9.172 14.828a4 4 0 01-5.656 0L2 13.5" /></svg><span>Free Cancellation*</span></div>
            </div>
          </div>
        </div>

        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-12 text-gray-50">
            <path d="M0 48H1440V14C1440 6.268 1433.73 0 1426 0H14C6.268 0 0 6.268 0 14V48Z" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 -mt-8 pb-12 space-y-6">

        {/* Why Choose Us - Feature Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <FeatureCard emoji="🏥" title="Top Verified Doctors" description="Handpicked specialists with years of experience" color="blue" />
          <FeatureCard emoji="💳" title="Secure Payments" description="100% secure transactions with instant receipts" color="green" />
          <FeatureCard emoji="🎥" title="Video Consultation" description="Connect with doctors from anywhere" color="purple" />
          <FeatureCard emoji="🔄" title="Easy Cancellation" description="Cancel anytime with partial refunds" color="orange" />
        </div>

        {/* Quick Actions Bar */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ready to book?</p>
              <p className="text-sm font-bold text-gray-900">Find your perfect doctor today</p>
            </div>
          </div>
          <Link href="/dashboard/doctors" className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-all shadow-md flex items-center gap-2">
            Book Appointment
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Stat cards - FIXED with correct data */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <StatCard loading={loading} label="Upcoming" value={upcoming.length} color="blue"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
          />
          <StatCard loading={loading} label="Today" value={todayAppointments.length} color="cyan"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard loading={loading} label="Past" value={past.length} color="purple"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard loading={loading} label="Pending Cancellations" value={pendingCancellations} color="amber"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
          />
          <StatCard loading={loading} label="Refunds Processed" value={totalRefunded} color="green"
            icon={<svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
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

        {/* Upcoming Appointments Section - FIXED View All button to /dashboard/appointments */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-50/40">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Upcoming Appointments
                {upcoming.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {upcoming.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">Confirmed & upcoming appointments</p>
            </div>
            <Link href="/dashboard/appointments" className="text-xs text-blue-600 font-bold hover:underline">
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
                <Link href="/dashboard/doctors" className="mt-4 px-4 py-2 rounded-xl bg-blue-600 text-white text-xs font-bold">
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
              { label: "Find a Doctor", href: "/dashboard/doctors", emoji: "🔍", from: "from-blue-50", to: "to-blue-100", border: "border-blue-200", hover: "hover:border-blue-300" },
              { label: "My Appointments", href: "/dashboard/appointments", emoji: "📅", from: "from-green-50", to: "to-green-100", border: "border-green-200", hover: "hover:border-green-300" },
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