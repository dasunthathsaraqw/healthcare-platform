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
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "DR";
}

const SPECIALTY_COLORS = {
  Cardiologist:      "bg-red-50 text-red-600 border-red-200",
  Dermatologist:     "bg-pink-50 text-pink-600 border-pink-200",
  Neurologist:       "bg-purple-50 text-purple-600 border-purple-200",
  Pediatrician:      "bg-blue-50 text-blue-600 border-blue-200",
  Gynecologist:      "bg-rose-50 text-rose-600 border-rose-200",
  Orthopedic:        "bg-orange-50 text-orange-600 border-orange-200",
  "General Physician":"bg-green-50 text-green-600 border-green-200",
};

function SpecialtyBadge({ specialty }) {
  const cls = SPECIALTY_COLORS[specialty] || "bg-gray-100 text-gray-600 border-gray-200";
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>
      {specialty || "Unknown"}
    </span>
  );
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
// DOCTOR DETAIL MODAL (Verify/View)
// ─────────────────────────────────────────────────────────────────────────────

function DoctorDetailModal({ open, doctor, mode, onClose, onVerify, onReject, verifying }) {
  const [notes, setNotes] = useState("");

  useEffect(() => { if (open) setNotes(""); }, [open]);

  if (!open || !doctor || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-violet-50 to-purple-50 shrink-0">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold text-base shrink-0 shadow-md">
            {getInitials(doctor.name)}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{doctor.name}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              <SpecialtyBadge specialty={doctor.specialty} />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full
                ${doctor.isVerified ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
                {doctor.isVerified ? "✓ Verified" : "⏳ Pending"}
              </span>
            </div>
          </div>
          <button onClick={onClose}
            className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Email",             doctor.email],
              ["Phone",             doctor.phone],
              ["Experience",        doctor.experience != null ? `${doctor.experience} years` : null],
              ["Consultation Fee",  doctor.consultationFee != null ? `$${doctor.consultationFee}` : null],
              ["Registered",        fmtDate(doctor.createdAt)],
              ["Status",            doctor.isActive ? "Active" : "Inactive"],
            ].map(([label, val]) => val ? (
              <div key={label} className="bg-gray-50 rounded-xl px-3.5 py-3 border border-gray-100">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{val}</p>
              </div>
            ) : null)}
          </div>

          {/* Qualifications */}
          {(doctor.qualifications || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Qualifications</p>
              <div className="flex flex-wrap gap-1.5">
                {doctor.qualifications.map((q, i) => (
                  <span key={i} className="px-2.5 py-1 bg-violet-50 text-violet-700 text-xs font-semibold rounded-lg border border-violet-200">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Languages */}
          {(doctor.languages || []).length > 0 && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Languages</p>
              <div className="flex flex-wrap gap-1.5">
                {doctor.languages.map((l, i) => (
                  <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-600 text-xs font-medium rounded-lg border border-blue-100">{l}</span>
                ))}
              </div>
            </div>
          )}

          {/* Clinic address */}
          {doctor.clinicAddress && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Clinic Address</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100">{doctor.clinicAddress}</p>
            </div>
          )}

          {/* Bio */}
          {doctor.bio && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Bio</p>
              <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-4 py-3 border border-gray-100 leading-relaxed">{doctor.bio}</p>
            </div>
          )}

          {/* Admin notes (verify flow only) */}
          {mode === "verify" && (
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Admin Notes <span className="text-gray-300 font-normal">(optional)</span>
              </label>
              <textarea
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Internal notes about this verification…"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800
                  placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500
                  focus:border-transparent bg-gray-50 transition"
              />
            </div>
          )}
        </div>

        {/* Footer actions */}
        {mode === "verify" && (
          <div className="flex gap-3 px-6 py-4 border-t border-gray-100 shrink-0 bg-gray-50">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-white transition-colors">
              Cancel
            </button>
            <button onClick={() => onVerify(doctor._id, notes)} disabled={verifying}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-bold
                disabled:opacity-60 shadow-md shadow-green-200 flex items-center justify-center gap-2 transition-colors">
              {verifying
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Verifying…</>
                : <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>Confirm Verify</>
              }
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────

function RejectModal({ open, doctor, onClose, onConfirm, rejecting }) {
  const [reason, setReason] = useState("");
  const [err, setErr]       = useState("");
  const textRef             = useRef(null);

  useEffect(() => {
    if (open) { setReason(""); setErr(""); setTimeout(() => textRef.current?.focus(), 60); }
  }, [open]);

  const handleSubmit = () => {
    if (!reason.trim()) { setErr("A rejection reason is required."); return; }
    onConfirm(doctor._id, reason.trim());
  };

  if (!open || !doctor || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-red-50 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center text-red-500 shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">Reject Registration</p>
            <p className="text-xs text-gray-500">Dr. {doctor.name}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-red-100 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Rejection Reason <span className="text-red-400">*</span>
            </label>
            <textarea ref={textRef} rows={4} value={reason}
              onChange={(e) => { setReason(e.target.value); setErr(""); }}
              placeholder="Explain why this registration is being rejected…"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 placeholder-gray-400
                resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent
                bg-gray-50 transition ${err ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>
          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={rejecting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold
                disabled:opacity-60 shadow-md shadow-red-200 flex items-center justify-center gap-2 transition-colors">
              {rejecting
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Rejecting…</>
                : "Confirm Reject"
              }
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SUSPEND MODAL
// ─────────────────────────────────────────────────────────────────────────────

function SuspendModal({ open, doctor, onClose, onConfirm, suspending }) {
  if (!open || !doctor || typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[210] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 animate-[scaleIn_.2s_ease-out]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-amber-100 mb-4">
          <svg className="w-7 h-7 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">
          {doctor.isActive ? "Suspend" : "Reactivate"} Doctor?
        </h3>
        <p className="text-sm text-gray-500 mb-6">
          {doctor.isActive
            ? `Dr. ${doctor.name} will lose access to the platform until reactivated.`
            : `Dr. ${doctor.name} will regain access to the platform.`
          }
        </p>
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
            Cancel
          </button>
          <button onClick={() => onConfirm(doctor._id, !doctor.isActive)} disabled={suspending}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold disabled:opacity-60
              flex items-center justify-center gap-2 shadow-md transition-colors
              ${doctor.isActive ? "bg-amber-500 hover:bg-amber-600 shadow-amber-200" : "bg-green-500 hover:bg-green-600 shadow-green-200"}`}>
            {suspending
              ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
              : doctor.isActive ? "Suspend" : "Reactivate"
            }
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR CARD (pending)
// ─────────────────────────────────────────────────────────────────────────────

function PendingDoctorCard({ doctor, onView, onVerify, onReject }) {
  return (
    <div className="bg-white rounded-2xl border border-amber-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      {/* Amber top bar */}
      <div className="h-1 w-full bg-gradient-to-r from-amber-400 to-orange-400" />

      <div className="p-5 space-y-4">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center text-white font-bold text-base shrink-0">
            {getInitials(doctor.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{doctor.name}</p>
            <p className="text-xs text-gray-500 truncate">{doctor.email}</p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
            ⏳ Pending
          </span>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Phone</span>
            <span className="text-gray-700 font-semibold truncate">{doctor.phone || "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Experience</span>
            <span className="text-gray-700 font-semibold">{doctor.experience != null ? `${doctor.experience} yrs` : "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Fee</span>
            <span className="text-gray-700 font-semibold">{doctor.consultationFee != null ? `$${doctor.consultationFee}` : "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Registered</span>
            <span className="text-gray-700 font-semibold">{fmtDate(doctor.createdAt)}</span>
          </div>
        </div>

        {/* Specialty */}
        <div className="flex flex-wrap gap-1.5 items-center">
          <SpecialtyBadge specialty={doctor.specialty} />
          {(doctor.qualifications || []).slice(0, 3).map((q, i) => (
            <span key={i} className="px-2 py-0.5 bg-violet-50 text-violet-600 text-[10px] font-semibold rounded-md border border-violet-200">{q}</span>
          ))}
          {(doctor.qualifications || []).length > 3 && (
            <span className="text-[10px] text-gray-400">+{doctor.qualifications.length - 3}</span>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button onClick={() => onView(doctor)}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold
              hover:bg-gray-50 transition-colors">
            View Details
          </button>
          <button onClick={() => onVerify(doctor)}
            className="flex-1 py-2 rounded-xl bg-green-500 hover:bg-green-600 text-white text-xs font-bold
              transition-colors shadow-sm shadow-green-200">
            ✓ Verify
          </button>
          <button onClick={() => onReject(doctor)}
            className="flex-1 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold
              border border-red-200 transition-colors">
            ✕ Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR CARD (verified)
// ─────────────────────────────────────────────────────────────────────────────

function VerifiedDoctorCard({ doctor, onView, onSuspend }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group">
      <div className={`h-1 w-full ${doctor.isActive ? "bg-gradient-to-r from-green-400 to-teal-400" : "bg-gray-300"}`} />

      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-base shrink-0">
            {doctor.profilePicture
              ? <img src={doctor.profilePicture} alt={doctor.name} className="w-full h-full rounded-xl object-cover" />
              : getInitials(doctor.name)
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{doctor.name}</p>
            <p className="text-xs text-gray-500 truncate">{doctor.email}</p>
          </div>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0
            ${doctor.isActive
              ? "bg-green-50 text-green-700 border-green-200"
              : "bg-gray-100 text-gray-500 border-gray-200"}`}>
            {doctor.isActive ? "● Active" : "○ Suspended"}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Phone</span>
            <span className="text-gray-700 font-semibold truncate">{doctor.phone || "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Experience</span>
            <span className="text-gray-700 font-semibold">{doctor.experience != null ? `${doctor.experience} yrs` : "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Fee</span>
            <span className="text-gray-700 font-semibold">{doctor.consultationFee != null ? `$${doctor.consultationFee}` : "—"}</span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-gray-400 font-medium">Verified</span>
            <span className="text-gray-700 font-semibold">{fmtDate(doctor.updatedAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <SpecialtyBadge specialty={doctor.specialty} />
        </div>

        <div className="flex gap-2 pt-1 border-t border-gray-100">
          <button onClick={() => onView(doctor)}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold hover:bg-gray-50 transition-colors">
            View
          </button>
          <button onClick={() => onSuspend(doctor)}
            className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-colors
              ${doctor.isActive
                ? "border-amber-200 text-amber-600 hover:bg-amber-50"
                : "border-green-200 text-green-600 hover:bg-green-50"}`}>
            {doctor.isActive ? "Suspend" : "Reactivate"}
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
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-gray-200" />
        <div className="flex-1 space-y-2"><div className="h-3.5 w-32 bg-gray-200 rounded" /><div className="h-2.5 w-48 bg-gray-100 rounded" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2">{[1,2,3,4].map((i) => <div key={i} className="h-10 bg-gray-100 rounded-xl" />)}</div>
      <div className="flex gap-2"><div className="h-5 w-20 bg-gray-100 rounded-full" /><div className="h-5 w-16 bg-gray-100 rounded-full" /></div>
      <div className="flex gap-2 pt-1 border-t border-gray-100">{[1,2,3].map((i) => <div key={i} className="flex-1 h-8 bg-gray-100 rounded-xl" />)}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// EMPTY STATE
// ─────────────────────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-4">{icon}</div>
      <p className="text-sm font-semibold text-gray-700">{title}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

const SPECIALTIES = [
  "All Specialties",
  "Cardiologist", "Dermatologist", "Neurologist",
  "Pediatrician", "Gynecologist", "Orthopedic", "General Physician",
];

export default function AdminDoctorsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [pending,   setPending]   = useState([]);
  const [verified,  setVerified]  = useState([]);
  const [loading,   setLoading]   = useState(false);

  const [search,    setSearch]    = useState("");
  const [specialty, setSpecialty] = useState("All Specialties");

  // Modals
  const [detailDoctor,  setDetailDoctor]  = useState(null);
  const [detailMode,    setDetailMode]    = useState("view"); // "view" | "verify"
  const [rejectDoctor,  setRejectDoctor]  = useState(null);
  const [suspendDoctor, setSuspendDoctor] = useState(null);

  const [verifying,  setVerifying]  = useState(false);
  const [rejecting,  setRejecting]  = useState(false);
  const [suspending, setSuspending] = useState(false);

  // Toasts
  const toastRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pendRes, verRes] = await Promise.allSettled([
        axios.get(`${API_BASE}/admin/doctors/pending`,  { headers: authHeaders() }),
        axios.get(`${API_BASE}/admin/doctors/verified`, { headers: authHeaders() }),
      ]);
      if (pendRes.status === "fulfilled") setPending(pendRes.value.data.doctors || pendRes.value.data || []);
      if (verRes.status  === "fulfilled") setVerified(verRes.value.data.doctors || verRes.value.data  || []);
    } catch (err) {
      addToast("Failed to load doctor data", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Verify ─────────────────────────────────────────────────────────────────
  const handleVerify = async (id, notes) => {
    setVerifying(true);
    try {
      await axios.put(`${API_BASE}/admin/doctors/${id}/verify`, { notes }, { headers: authHeaders() });
      addToast("Doctor verified successfully!", "success");
      setDetailDoctor(null);
      setPending((p) => p.filter((d) => d._id !== id));
      fetchAll();
    } catch (err) {
      addToast(err.response?.data?.message || "Verification failed", "error");
    } finally {
      setVerifying(false);
    }
  };

  // ── Reject ─────────────────────────────────────────────────────────────────
  const handleReject = async (id, reason) => {
    setRejecting(true);
    try {
      await axios.put(`${API_BASE}/admin/doctors/${id}/reject`, { reason }, { headers: authHeaders() });
      addToast("Registration rejected.", "success");
      setRejectDoctor(null);
      setPending((p) => p.filter((d) => d._id !== id));
    } catch (err) {
      addToast(err.response?.data?.message || "Rejection failed", "error");
    } finally {
      setRejecting(false);
    }
  };

  // ── Suspend / Reactivate ───────────────────────────────────────────────────
  const handleSuspend = async (id, makeActive) => {
    setSuspending(true);
    try {
      await axios.put(`${API_BASE}/admin/doctors/${id}/verify`,
        { isActive: makeActive },
        { headers: authHeaders() }
      );
      addToast(makeActive ? "Doctor reactivated." : "Doctor suspended.", "success");
      setSuspendDoctor(null);
      setVerified((prev) => prev.map((d) => d._id === id ? { ...d, isActive: makeActive } : d));
    } catch (err) {
      addToast(err.response?.data?.message || "Action failed", "error");
    } finally {
      setSuspending(false);
    }
  };

  // ── Filtered lists ─────────────────────────────────────────────────────────
  const filterList = (list) =>
    list.filter((d) => {
      const matchSearch = !search
        || d.name?.toLowerCase().includes(search.toLowerCase())
        || d.email?.toLowerCase().includes(search.toLowerCase());
      const matchSpec = specialty === "All Specialties" || d.specialty === specialty;
      return matchSearch && matchSpec;
    });

  const displayList = activeTab === "pending"  ? filterList(pending)
    : activeTab === "verified" ? filterList(verified)
    : filterList([...pending, ...verified]);

  const TABS = [
    { id: "pending",  label: "Pending Verification", count: pending.length,  badge: true },
    { id: "verified", label: "Verified Doctors",     count: verified.length, badge: false },
    { id: "all",      label: "All Doctors",           count: null,            badge: false },
  ];

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />

      <DoctorDetailModal
        open={!!detailDoctor}
        doctor={detailDoctor}
        mode={detailMode}
        onClose={() => setDetailDoctor(null)}
        onVerify={handleVerify}
        onReject={() => { setDetailDoctor(null); setRejectDoctor(detailDoctor); }}
        verifying={verifying}
      />
      <RejectModal
        open={!!rejectDoctor}
        doctor={rejectDoctor}
        onClose={() => setRejectDoctor(null)}
        onConfirm={handleReject}
        rejecting={rejecting}
      />
      <SuspendModal
        open={!!suspendDoctor}
        doctor={suspendDoctor}
        onClose={() => setSuspendDoctor(null)}
        onConfirm={handleSuspend}
        suspending={suspending}
      />

      <div className="max-w-7xl mx-auto space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Doctor Management</h1>
            <p className="text-sm text-gray-500 mt-0.5">Review and verify doctor registrations</p>
          </div>
          <button onClick={fetchAll} disabled={loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200
              hover:border-violet-300 hover:bg-violet-50 text-sm font-semibold text-gray-600 hover:text-violet-600
              transition-all disabled:opacity-50 self-start">
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            {loading ? "Refreshing…" : "Refresh"}
          </button>
        </div>

        {/* ── Summary stats ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Pending Review", value: pending.length,  color: "amber",  icon: "⏳" },
            { label: "Verified",       value: verified.filter(d => d.isActive).length, color: "green", icon: "✓" },
            { label: "Suspended",      value: verified.filter(d => !d.isActive).length, color: "gray",  icon: "○" },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 flex items-center gap-4">
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl
                ${s.color === "amber" ? "bg-amber-100" : s.color === "green" ? "bg-green-100" : "bg-gray-100"}`}>
                {s.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{loading ? "—" : s.value}</p>
                <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* ── Tabs + filters ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {TABS.map((tab) => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors
                  ${activeTab === tab.id
                    ? "border-violet-600 text-violet-600 bg-violet-50/30"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
                {tab.label}
                {tab.badge && tab.count > 0 && (
                  <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full
                    bg-amber-500 text-white text-[10px] font-bold">
                    {tab.count}
                  </span>
                )}
                {!tab.badge && tab.count != null && (
                  <span className="text-[10px] font-bold text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Search + specialty filter */}
          <div className="flex flex-wrap gap-3 px-5 py-4 border-b border-gray-100 bg-gray-50/50">
            <div className="relative flex-1 min-w-48">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 text-sm text-gray-800
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent
                  bg-white transition" />
            </div>
            <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}
              className="px-3 py-2 rounded-xl border border-gray-200 text-sm text-gray-700 bg-white
                focus:outline-none focus:ring-2 focus:ring-violet-500 cursor-pointer appearance-none pr-8">
              {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
            </select>
            {(search || specialty !== "All Specialties") && (
              <button onClick={() => { setSearch(""); setSpecialty("All Specialties"); }}
                className="px-3 py-2 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-100">
                Clear ✕
              </button>
            )}
          </div>

          {/* Cards grid */}
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {loading
                ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
                : displayList.length === 0
                  ? <EmptyState
                      icon={activeTab === "pending" ? "✅" : "🔍"}
                      title={activeTab === "pending" ? "No pending registrations" : "No doctors found"}
                      subtitle={activeTab === "pending"
                        ? "All registrations have been processed"
                        : "Try adjusting your search filters"
                      }
                    />
                  : displayList.map((doctor) =>
                      activeTab === "verified" || (activeTab === "all" && doctor.isVerified)
                        ? <VerifiedDoctorCard
                            key={doctor._id}
                            doctor={doctor}
                            onView={(d) => { setDetailDoctor(d); setDetailMode("view"); }}
                            onSuspend={setSuspendDoctor}
                          />
                        : <PendingDoctorCard
                            key={doctor._id}
                            doctor={doctor}
                            onView={(d) => { setDetailDoctor(d); setDetailMode("view"); }}
                            onVerify={(d) => { setDetailDoctor(d); setDetailMode("verify"); }}
                            onReject={setRejectDoctor}
                          />
                    )
              }
            </div>

            {/* Result count */}
            {!loading && displayList.length > 0 && (
              <p className="text-xs text-gray-400 text-center mt-4">
                Showing {displayList.length} {activeTab === "pending" ? "pending" : ""} doctor{displayList.length !== 1 ? "s" : ""}
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
