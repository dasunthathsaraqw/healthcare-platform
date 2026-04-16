"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined"
    ? (localStorage.getItem("adminToken") || localStorage.getItem("token"))
    : "";
  return { Authorization: `Bearer ${t}` };
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { 
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit"
  });
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "PT";
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[300] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
            animate-[slideUp_.2s_ease-out]
            ${t.type === "success" ? "bg-green-600 text-white"
              : t.type === "error" ? "bg-red-600 text-white"
              : "bg-slate-800 text-white"}`}>
          {t.type === "success"
            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" /></svg>
            : <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>
          }
          <span>{t.message}</span>
          <button onClick={() => removeToast(t.id)} className="ml-1 opacity-70 hover:opacity-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT DETAILS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PaymentDetailsModal({ open, payment, onClose }) {
  if (!open || !payment || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-600 to-indigo-600 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-white">Payment Details</p>
            <p className="text-xs text-blue-100">Transaction Information</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Payment ID</span>
              <span className="text-xs font-mono text-gray-800">{payment._id?.slice(-12) || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Order ID</span>
              <span className="text-xs font-mono text-gray-800">{payment.payhereOrderId || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Transaction ID</span>
              <span className="text-xs font-mono text-gray-800">{payment.transactionId || 'N/A'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Amount</span>
              <span className="text-sm font-bold text-green-600">Rs. {payment.amount?.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Status</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                payment.status === 'completed' ? 'bg-green-100 text-green-700' :
                payment.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {payment.status || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">Created At</span>
              <span className="text-xs text-gray-600">{fmtDate(payment.createdAt)}</span>
            </div>
          </div>
          
          {payment.metadata && (
            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2">Additional Info</p>
              <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                {payment.metadata.patientName && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Patient Name</span>
                    <span className="text-xs text-gray-700">{payment.metadata.patientName}</span>
                  </div>
                )}
                {payment.metadata.patientEmail && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Patient Email</span>
                    <span className="text-xs text-gray-700">{payment.metadata.patientEmail}</span>
                  </div>
                )}
                {payment.metadata.reservationId && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Reservation ID</span>
                    <span className="text-xs font-mono text-gray-700">{payment.metadata.reservationId}</span>
                  </div>
                )}
                {payment.metadata.appointmentId && (
                  <div className="flex justify-between">
                    <span className="text-xs text-gray-500">Appointment ID</span>
                    <span className="text-xs font-mono text-gray-700">{payment.metadata.appointmentId}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PAYMENT CARD
// ─────────────────────────────────────────────────────────────────────────────

function PaymentCard({ payment, onViewDetails }) {
  const status = payment.status || "pending";
  
  const statusStyles = {
    completed: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200", icon: "✅" },
    pending: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200", icon: "⏳" },
    failed: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", icon: "❌" },
    cancelled: { bg: "bg-gray-100", text: "text-gray-500", border: "border-gray-200", icon: "🚫" },
    refunded: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", icon: "🔄" },
  };
  
  const sc = statusStyles[status] || statusStyles.pending;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className={`h-1 w-full ${
        status === 'completed' ? 'bg-green-500' :
        status === 'pending' ? 'bg-yellow-500' :
        status === 'failed' ? 'bg-red-500' :
        status === 'refunded' ? 'bg-purple-500' : 'bg-gray-500'
      }`} />
      
      <div className="p-5 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(payment.metadata?.patientName || "PT")}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{payment.metadata?.patientName || 'Unknown Patient'}</p>
              <p className="text-xs text-gray-500">ID: {payment.patientId?.slice(-8) || 'N/A'}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${sc.bg} ${sc.text} ${sc.border}`}>
            {sc.icon} {status.toUpperCase()}
          </span>
        </div>

        {/* Payment Details Grid */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 rounded-xl p-2.5">
            <p className="text-[9px] text-blue-500 font-semibold uppercase">Order ID</p>
            <p className="text-xs font-mono text-gray-700 truncate">{payment.payhereOrderId || 'N/A'}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5">
            <p className="text-[9px] text-green-500 font-semibold uppercase">Amount</p>
            <p className="text-sm font-bold text-green-600">Rs. {payment.amount?.toFixed(2)}</p>
          </div>
          <div className="bg-purple-50 rounded-xl p-2.5">
            <p className="text-[9px] text-purple-500 font-semibold uppercase">Transaction ID</p>
            <p className="text-xs font-mono text-gray-700 truncate">{payment.transactionId || 'N/A'}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5">
            <p className="text-[9px] text-amber-500 font-semibold uppercase">Date</p>
            <p className="text-xs font-bold text-gray-700">{fmtDate(payment.createdAt)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onViewDetails(payment)}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold
              flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
            </svg>
            View Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [filter, setFilter] = useState("all"); // all, completed, pending, failed
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    pending: 0,
    failed: 0,
    totalAmount: 0,
  });

  const toastRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all payments from payment service
      const response = await axios.get(`${API_BASE}/payments/admin/all`, {
        headers: authHeaders()
      });
      const paymentList = response.data.payments || [];
      setPayments(paymentList);
      
      // Calculate stats
      const completed = paymentList.filter(p => p.status === "completed").length;
      const pending = paymentList.filter(p => p.status === "pending").length;
      const failed = paymentList.filter(p => p.status === "failed" || p.status === "cancelled").length;
      const totalAmount = paymentList.reduce((sum, p) => sum + (p.amount || 0), 0);
      
      setStats({
        total: paymentList.length,
        completed,
        pending,
        failed,
        totalAmount,
      });
    } catch (err) {
      console.error("Fetch error:", err);
      addToast("Failed to load payments", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const filteredPayments = payments.filter(p => {
    if (filter === "all") return true;
    if (filter === "completed") return p.status === "completed";
    if (filter === "pending") return p.status === "pending";
    if (filter === "failed") return p.status === "failed" || p.status === "cancelled";
    return true;
  });

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <PaymentDetailsModal
        open={!!selectedPayment}
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Payments Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">View and manage all payment transactions</p>
          </div>
          <button onClick={fetchPayments} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200
              hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-600 hover:text-blue-600
              transition-all disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-lg">💰</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-xs text-gray-400 font-medium">Total Transactions</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center text-lg">✅</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
                <p className="text-xs text-gray-400 font-medium">Successful</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-yellow-100 flex items-center justify-center text-lg">⏳</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                <p className="text-xs text-gray-400 font-medium">Pending</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center text-lg">❌</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.failed}</p>
                <p className="text-xs text-gray-400 font-medium">Failed</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center text-lg">💵</div>
              <div>
                <p className="text-2xl font-bold text-gray-900">Rs. {stats.totalAmount.toFixed(2)}</p>
                <p className="text-xs text-gray-400 font-medium">Total Revenue</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setFilter("all")}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              filter === "all"
                ? "border-b-2 border-blue-500 text-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            All Payments
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              filter === "completed"
                ? "border-b-2 border-green-500 text-green-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Successful
          </button>
          <button
            onClick={() => setFilter("pending")}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              filter === "pending"
                ? "border-b-2 border-yellow-500 text-yellow-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending
          </button>
          <button
            onClick={() => setFilter("failed")}
            className={`px-4 py-2 text-sm font-semibold transition-all ${
              filter === "failed"
                ? "border-b-2 border-red-500 text-red-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Failed
          </button>
        </div>

        {/* Payments List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
            <div>
              <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                Payment Transactions
                {filteredPayments.length > 0 && (
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                    {filteredPayments.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">All payment transactions from the system</p>
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1,2,3,4].map((i) => (
                  <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gray-200" />
                      <div className="flex-1"><div className="h-3.5 w-32 bg-gray-200 rounded" /><div className="h-2.5 w-24 bg-gray-100 rounded mt-1" /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-12 bg-gray-100 rounded-xl" />
                      <div className="h-12 bg-gray-100 rounded-xl" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-4">💰</div>
                <p className="text-sm font-semibold text-gray-700">No payments found</p>
                <p className="text-xs text-gray-400 mt-1">No transactions match the selected filter</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredPayments.map((payment) => (
                  <PaymentCard
                    key={payment._id}
                    payment={payment}
                    onViewDetails={setSelectedPayment}
                  />
                ))}
              </div>
            )}

            {!loading && filteredPayments.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Showing {filteredPayments.length} payment{filteredPayments.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </>
  );
}