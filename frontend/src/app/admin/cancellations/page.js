"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

// Use API Gateway (port 8080) which routes to appointment service
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined"
    ? (localStorage.getItem("adminToken") || localStorage.getItem("token"))
    : "";
  return t ? { Authorization: `Bearer ${t}` } : {};
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
// PROCESS REFUND MODAL
// ─────────────────────────────────────────────────────────────────────────────

function ProcessRefundModal({ open, request, onClose, onConfirm, processing }) {
  const [refundReference, setRefundReference] = useState("");
  const [adminNotes, setAdminNotes] = useState("");

  useEffect(() => {
    if (open) {
      setRefundReference("");
      setAdminNotes("");
    }
  }, [open]);

  if (!open || !request || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-green-50 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center text-green-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Process Refund</p>
            <p className="text-xs text-gray-500">Refund amount: Rs. {request.refundAmount}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Refund Reference ID <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={refundReference}
              onChange={(e) => setRefundReference(e.target.value)}
              placeholder="PayHere Refund ID or Transaction ID"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Admin Notes <span className="text-gray-300">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Internal notes about this refund..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800
                focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent bg-gray-50 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => onConfirm(request._id, refundReference, adminNotes)} disabled={processing || !refundReference.trim()}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold
                disabled:opacity-60 flex items-center justify-center gap-2">
              {processing ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : "Confirm Refund Processed"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT CANCELLATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectCancellationModal({ open, request, onClose, onConfirm, rejecting }) {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  if (!open || !request || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-red-50 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-600 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Reject Cancellation</p>
            <p className="text-xs text-gray-500">Appointment will remain confirmed</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this cancellation being rejected?"
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800
                focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-gray-50 resize-none"
            />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={() => onConfirm(request._id, reason)} disabled={rejecting || !reason.trim()}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold
                disabled:opacity-60 flex items-center justify-center gap-2">
              {rejecting ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg> : "Confirm Rejection"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY DETAIL MODAL
// ─────────────────────────────────────────────────────────────────────────────

function HistoryDetailModal({ open, item, onClose }) {
  if (!open || !item || typeof window === "undefined") return null;

  const isProcessed = item.status === "cancelled" && item.refundProcessedAt;
  const isRejected = item.status === "confirmed" && item.adminNotes?.includes("rejected");

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        <div className={`flex items-center gap-3 px-6 py-4 border-b shrink-0 ${
          isProcessed ? "bg-green-50" : isRejected ? "bg-red-50" : "bg-gray-50"
        }`}>
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isProcessed ? "bg-green-100 text-green-600" : isRejected ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
          }`}>
            {isProcessed ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            ) : isRejected ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">
              {isProcessed ? "Refund Processed" : isRejected ? "Cancellation Rejected" : "History Item"}
            </p>
            <p className="text-xs text-gray-500">{fmtDate(item.dateTime)}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase">Patient</p>
              <p className="text-sm font-semibold text-gray-800">{item.patientName}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase">Doctor</p>
              <p className="text-sm font-semibold text-gray-800">{item.doctorName}</p>
            </div>
          </div>
          
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-[10px] text-blue-500 uppercase">Appointment Date</p>
            <p className="text-sm font-semibold text-gray-800">{fmtDate(item.dateTime)}</p>
          </div>
          
          {item.consultationFee > 0 && (
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
              <span className="text-sm text-gray-600">Original Fee</span>
              <span className="text-sm font-bold text-green-600">Rs. {item.consultationFee.toFixed(2)}</span>
            </div>
          )}
          
          {isProcessed && item.refundAmount > 0 && (
            <div className="flex justify-between items-center p-3 bg-amber-50 rounded-xl">
              <span className="text-sm text-gray-600">Refund Amount</span>
              <span className="text-sm font-bold text-amber-600">Rs. {item.refundAmount.toFixed(2)}</span>
            </div>
          )}
          
          {item.refundReference && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase">Refund Reference</p>
              <p className="text-sm font-mono text-gray-700">{item.refundReference}</p>
            </div>
          )}
          
          {item.adminNotes && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase">Admin Notes</p>
              <p className="text-sm text-gray-700 italic">{item.adminNotes}</p>
            </div>
          )}
          
          {item.cancellationReason && (
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[10px] text-gray-400 uppercase">Cancellation Reason</p>
              <p className="text-sm text-gray-700 italic">"{item.cancellationReason}"</p>
            </div>
          )}
          
          <div className="text-[10px] text-gray-400 text-center pt-2 border-t border-gray-100">
            Processed on: {fmtDate(item.refundProcessedAt || item.updatedAt)}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PENDING REQUEST CARD
// ─────────────────────────────────────────────────────────────────────────────

function CancellationRequestCard({ request, onProcess, onReject }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />
      
      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-sm">
              {getInitials(request.patientName)}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{request.patientName}</p>
              <p className="text-xs text-gray-500">ID: {request.patientId?.slice(-8)}</p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
            ⏳ Pending
          </span>
        </div>

        <div className="bg-gray-50 rounded-xl p-3">
          <p className="text-[10px] text-gray-400 uppercase">Doctor</p>
          <p className="text-sm font-semibold text-gray-800">{request.doctorName}</p>
          <p className="text-xs text-gray-500">{request.specialty}</p>
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="bg-blue-50 rounded-xl p-2.5">
            <p className="text-[9px] text-blue-500 font-semibold uppercase">Date & Time</p>
            <p className="text-xs font-bold text-gray-700">{fmtDate(request.dateTime)}</p>
          </div>
          <div className="bg-green-50 rounded-xl p-2.5">
            <p className="text-[9px] text-green-500 font-semibold uppercase">Fee</p>
            <p className="text-xs font-bold text-gray-700">Rs. {request.consultationFee?.toFixed(2)}</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-2.5 col-span-2">
            <p className="text-[9px] text-amber-500 font-semibold uppercase">Refund Amount</p>
            <p className="text-sm font-bold text-amber-600">Rs. {request.refundAmount?.toFixed(2)}</p>
          </div>
        </div>

        {request.cancellationReason && (
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-[10px] text-gray-400 uppercase">Reason</p>
            <p className="text-xs text-gray-700 mt-1 italic">"{request.cancellationReason}"</p>
          </div>
        )}

        <p className="text-[10px] text-gray-400">Requested: {fmtDate(request.refundRequestedAt)}</p>

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={() => onProcess(request)}
            className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
            </svg>
            Process Refund
          </button>
          <button
            onClick={() => onReject(request)}
            className="flex-1 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// HISTORY CARD (for processed/rejected items)
// ─────────────────────────────────────────────────────────────────────────────

function HistoryCard({ item, onClick }) {
  const isProcessed = item.status === "cancelled" && item.refundProcessedAt;
  const isRejected = item.status === "confirmed" && item.adminNotes?.includes("reject");
  
  return (
    <div 
      onClick={() => onClick(item)}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200 overflow-hidden cursor-pointer"
    >
      <div className={`h-1 w-full ${isProcessed ? "bg-green-400" : isRejected ? "bg-red-400" : "bg-gray-400"}`} />
      
      <div className="p-4 space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm ${
              isProcessed ? "bg-gradient-to-br from-green-500 to-emerald-500" : 
              isRejected ? "bg-gradient-to-br from-red-500 to-rose-500" : "bg-gradient-to-br from-gray-500 to-gray-600"
            }`}>
              {getInitials(item.patientName)}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-900">{item.patientName}</p>
              <p className="text-xs text-gray-500">{item.doctorName}</p>
            </div>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
            isProcessed ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          }`}>
            {isProcessed ? "✓ Refunded" : "✗ Rejected"}
          </span>
        </div>

        <div className="flex justify-between items-center text-xs">
          <span className="text-gray-500">{fmtDate(item.dateTime)}</span>
          {item.refundAmount > 0 && isProcessed && (
            <span className="font-semibold text-amber-600">Rs. {item.refundAmount.toFixed(2)}</span>
          )}
        </div>

        {item.adminNotes && (
          <p className="text-[10px] text-gray-400 truncate">Note: {item.adminNotes}</p>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminCancellationsPage() {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [modalType, setModalType] = useState(null);
  const [selectedHistory, setSelectedHistory] = useState(null);
  const [activeTab, setActiveTab] = useState("pending");

  const toastRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch pending cancellation requests
      const pendingRes = await axios.get(`${API_BASE}/appointments/admin/cancellation-requests`, {
        headers: authHeaders()
      });
      setPendingRequests(pendingRes.data.requests || []);
      
      // Fetch processed history (cancelled with refund or rejected)
      const historyRes = await axios.get(`${API_BASE}/appointments/admin/cancellation-history`, {
        headers: authHeaders()
      });
      setHistoryItems(historyRes.data.history || []);
    } catch (err) {
      console.error("Fetch error:", err);
      addToast("Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleProcessRefund = async (id, refundReference, adminNotes) => {
    setProcessing(true);
    try {
      await axios.put(`${API_BASE}/appointments/admin/cancellation-requests/${id}/process`, {
        refundReference,
        adminNotes
      }, { headers: authHeaders() });
      
      addToast("Refund marked as processed successfully!", "success");
      setModalType(null);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to process refund", "error");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectCancellation = async (id, rejectionReason) => {
    setRejecting(true);
    try {
      await axios.put(`${API_BASE}/appointments/admin/cancellation-requests/${id}/reject`, {
        rejectionReason
      }, { headers: authHeaders() });
      
      addToast("Cancellation request rejected. Appointment remains confirmed.", "success");
      setModalType(null);
      setSelectedRequest(null);
      fetchData();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to reject cancellation", "error");
    } finally {
      setRejecting(false);
    }
  };

  const totalRefundAmount = pendingRequests.reduce((sum, r) => sum + (r.refundAmount || 0), 0);
  const totalProcessedRefunds = historyItems.filter(h => h.status === "cancelled" && h.refundProcessedAt).reduce((sum, h) => sum + (h.refundAmount || 0), 0);

  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <ProcessRefundModal
        open={modalType === "process"}
        request={selectedRequest}
        onClose={() => { setModalType(null); setSelectedRequest(null); }}
        onConfirm={handleProcessRefund}
        processing={processing}
      />

      <RejectCancellationModal
        open={modalType === "reject"}
        request={selectedRequest}
        onClose={() => { setModalType(null); setSelectedRequest(null); }}
        onConfirm={handleRejectCancellation}
        rejecting={rejecting}
      />

      <HistoryDetailModal
        open={!!selectedHistory}
        item={selectedHistory}
        onClose={() => setSelectedHistory(null)}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cancellation & Refund Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review, process, and track cancellation refund requests</p>
          </div>
          <button onClick={fetchData} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200
              hover:border-amber-300 hover:bg-amber-50 text-sm font-semibold text-gray-600 hover:text-amber-600
              transition-all disabled:opacity-50">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-amber-100 flex items-center justify-center text-xl">⏳</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{pendingRequests.length}</p>
              <p className="text-xs text-gray-400 font-medium">Pending Requests</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">💰</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">Rs. {totalRefundAmount.toFixed(2)}</p>
              <p className="text-xs text-gray-400 font-medium">Pending Refunds</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-green-100 flex items-center justify-center text-xl">✅</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{historyItems.filter(h => h.status === "cancelled" && h.refundProcessedAt).length}</p>
              <p className="text-xs text-gray-400 font-medium">Refunds Processed</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-red-100 flex items-center justify-center text-xl">❌</div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{historyItems.filter(h => h.status === "confirmed" && h.adminNotes?.includes("reject")).length}</p>
              <p className="text-xs text-gray-400 font-medium">Rejected</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          <button
            onClick={() => setActiveTab("pending")}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === "pending"
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            Pending Requests
            {pendingRequests.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700">
                {pendingRequests.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`px-6 py-3 text-sm font-semibold transition-all ${
              activeTab === "history"
                ? "border-b-2 border-amber-500 text-amber-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            History
            {historyItems.length > 0 && (
              <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                {historyItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Pending Requests Tab */}
        {activeTab === "pending" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-amber-50/40">
              <div>
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Pending Cancellation Requests
                  {pendingRequests.length > 0 && (
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                      {pendingRequests.length}
                    </span>
                  )}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5">Review each request and process refund or reject</p>
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
                      <div className="h-16 bg-gray-100 rounded-xl" />
                      <div className="flex gap-2"><div className="flex-1 h-8 bg-gray-100 rounded-xl" /><div className="flex-1 h-8 bg-gray-100 rounded-xl" /></div>
                    </div>
                  ))}
                </div>
              ) : pendingRequests.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center text-3xl mb-4">✅</div>
                  <p className="text-sm font-semibold text-gray-700">No pending cancellation requests</p>
                  <p className="text-xs text-gray-400 mt-1">All cancellation requests have been processed</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {pendingRequests.map((request) => (
                    <CancellationRequestCard
                      key={request._id}
                      request={request}
                      onProcess={(req) => { setSelectedRequest(req); setModalType("process"); }}
                      onReject={(req) => { setSelectedRequest(req); setModalType("reject"); }}
                    />
                  ))}
                </div>
              )}

              {!loading && pendingRequests.length > 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">
                  Showing {pendingRequests.length} pending cancellation request{pendingRequests.length !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
              <div>
                <h2 className="text-sm font-bold text-gray-900">Refund & Cancellation History</h2>
                <p className="text-xs text-gray-400 mt-0.5">Track all processed refunds and rejected cancellations</p>
              </div>
            </div>

            <div className="p-5">
              {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1,2,3,4].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 animate-pulse">
                      <div className="flex items-center gap-3"><div className="w-9 h-9 rounded-xl bg-gray-200" /><div className="flex-1"><div className="h-3 w-24 bg-gray-200 rounded" /><div className="h-2 w-32 bg-gray-100 rounded mt-1" /></div></div>
                      <div className="h-4 bg-gray-100 rounded" />
                    </div>
                  ))}
                </div>
              ) : historyItems.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-3xl mb-4">📋</div>
                  <p className="text-sm font-semibold text-gray-700">No history yet</p>
                  <p className="text-xs text-gray-400 mt-1">Processed refunds and rejected cancellations will appear here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-gray-400">
                    Total processed refunds: Rs. {totalProcessedRefunds.toFixed(2)}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {historyItems.map((item) => (
                      <HistoryCard key={item._id} item={item} onClick={setSelectedHistory} />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <div>
              <p className="text-sm font-semibold text-blue-800">How to Process Refunds</p>
              <p className="text-xs text-blue-600 mt-1">
                1. Log into PayHere Sandbox/Live Dashboard<br/>
                2. Find the transaction using the Payment ID<br/>
                3. Click "Refund" and enter the refund amount<br/>
                4. Copy the Refund Transaction ID<br/>
                5. Click "Process Refund" here and paste the Refund ID
              </p>
            </div>
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