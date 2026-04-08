"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return t ? { Authorization: `Bearer ${t}` } : {};
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const SPECIALTIES = [
  "All Specialties",
  "Cardiologist", "Dermatologist", "Neurologist",
  "Pediatrician", "Gynecologist", "Orthopedic", "General Physician",
];

function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "DR";
}

function pseudoRating(name = "") {
  // Deterministic 3.5–5.0 star based on name
  const code = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  return (3.5 + (code % 16) / 10).toFixed(1);
}

function StarRating({ rating }) {
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg key={i} className={`w-3.5 h-3.5 ${i < full ? "text-amber-400" : i === full && half ? "text-amber-300" : "text-gray-200"}`}
          fill="currentColor" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
      <span className="text-[10px] text-gray-500 ml-1 font-semibold">{rating}</span>
    </div>
  );
}

const AVATAR_COLORS = [
  "from-blue-500 to-cyan-400", "from-violet-500 to-purple-400",
  "from-emerald-500 to-teal-400", "from-rose-500 to-pink-400",
  "from-amber-500 to-orange-400", "from-indigo-500 to-blue-400",
];
function avatarColor(name = "") {
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

const SPECIALTY_BADGES = {
  Cardiologist:       "bg-red-50   text-red-600   border-red-200",
  Dermatologist:      "bg-pink-50  text-pink-600  border-pink-200",
  Neurologist:        "bg-purple-50 text-purple-600 border-purple-200",
  Pediatrician:       "bg-blue-50  text-blue-600  border-blue-200",
  Gynecologist:       "bg-rose-50  text-rose-600  border-rose-200",
  Orthopedic:         "bg-orange-50 text-orange-600 border-orange-200",
  "General Physician":"bg-green-50 text-green-600 border-green-200",
};

function SpecBadge({ specialty }) {
  const cls = SPECIALTY_BADGES[specialty] || "bg-gray-100 text-gray-600 border-gray-200";
  return <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${cls}`}>{specialty}</span>;
}

// ─────────────────────────────────────────────────────────────────────────────
// TOAST
// ─────────────────────────────────────────────────────────────────────────────

function ToastContainer({ toasts, removeToast }) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium
            animate-[slideUp_.2s_ease-out]
            ${t.type === "success" ? "bg-green-600 text-white" : t.type === "error" ? "bg-red-600 text-white" : "bg-gray-900 text-white"}`}>
          {t.type === "success"
            ? <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
            : <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
          }
          {t.message}
          <button onClick={() => removeToast(t.id)} className="ml-1 opacity-70 hover:opacity-100">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BOOKING CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────────────────────────

function BookingModal({ open, doctor, slot, date, onClose, onConfirm, booking }) {
  const [reason, setReason] = useState("");
  const [err, setErr]       = useState("");

  useEffect(() => { if (open) { setReason(""); setErr(""); } }, [open]);

  const handleSubmit = () => {
    if (!reason.trim()) { setErr("Please describe your reason for visit."); return; }
    onConfirm({ reason: reason.trim() });
  };

  if (!open || !doctor || !slot || typeof window === "undefined") return null;

  const formattedDate = date
    ? new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "—";

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
          <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${avatarColor(doctor.name)} flex items-center justify-center text-white font-bold text-base shrink-0`}>
            {getInitials(doctor.name)}
          </div>
          <div>
            <p className="text-sm font-bold text-gray-900">{doctor.name}</p>
            <SpecBadge specialty={doctor.specialty} />
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Booking summary */}
          <div className="grid grid-cols-2 gap-3">
            {[
              ["Date",     formattedDate],
              ["Time",     slot.startTime],
              ["Duration", `${slot.slotDuration || 30} min`],
              ["Fee",      doctor.consultationFee ? `$${doctor.consultationFee}` : "Free"],
            ].map(([label, val]) => (
              <div key={label} className="bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-3">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wide mb-0.5">{label}</p>
                <p className="text-sm font-bold text-gray-900 truncate">{val}</p>
              </div>
            ))}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-1.5">
              Reason for Visit <span className="text-red-400">*</span>
            </label>
            <textarea rows={3} value={reason}
              onChange={(e) => { setReason(e.target.value); setErr(""); }}
              placeholder="Briefly describe your symptoms or reason for visit…"
              className={`w-full px-3.5 py-2.5 rounded-xl border text-sm text-gray-800 placeholder-gray-400
                resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                bg-gray-50 transition ${err ? "border-red-300 bg-red-50" : "border-gray-200"}`} />
            {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
          </div>

          {/* Fee notice */}
          {doctor.consultationFee > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl">
              <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
              </svg>
              <p className="text-xs text-amber-700">
                Consultation fee of <strong>${doctor.consultationFee}</strong> will be collected at the clinic
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Go Back
            </button>
            <button onClick={handleSubmit} disabled={booking}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
                disabled:opacity-60 shadow-md shadow-blue-200 flex items-center justify-center gap-2 transition-colors">
              {booking
                ? <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Booking…</>
                : "Proceed to Booking"
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
// SUCCESS MODAL (after booking)
// ─────────────────────────────────────────────────────────────────────────────

function BookingSuccess({ open, doctor, date, slot, onClose, onDashboard }) {
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[310] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-[scaleIn_.22s_ease-out]">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
        <p className="text-sm text-gray-500 mb-1">Your appointment with</p>
        <p className="text-base font-bold text-blue-600 mb-1">{doctor?.name}</p>
        <p className="text-sm text-gray-500 mb-6">
          on {date ? new Date(date).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" }) : "—"}
          {" "}at <strong>{slot?.startTime}</strong>
        </p>
        <div className="flex flex-col gap-2.5">
          <button onClick={onDashboard}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
              shadow-md shadow-blue-200 transition-colors">
            View My Appointments
          </button>
          <button onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Book Another
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR PROFILE MODAL
// ─────────────────────────────────────────────────────────────────────────────

function DoctorProfileModal({ open, doctor, onClose, onBook }) {
  const [date,      setDate]      = useState("");
  const [slots,     setSlots]     = useState([]);
  const [loadSlots, setLoadSlots] = useState(false);
  const [selSlot,   setSelSlot]   = useState(null);

  useEffect(() => {
    if (open) { setDate(""); setSlots([]); setSelSlot(null); }
  }, [open, doctor]);

  const fetchSlots = useCallback(async (d) => {
    if (!doctor || !d) return;
    setLoadSlots(true);
    setSelSlot(null);
    try {
      const { data } = await axios.get(
        `${API_BASE}/doctors/${doctor._id}/availability?date=${d}`,
        { headers: authHeaders() }
      );
      setSlots(data.availability || data || []);
    } catch {
      setSlots([]);
    } finally {
      setLoadSlots(false);
    }
  }, [doctor]);

  const handleDateChange = (d) => { setDate(d); fetchSlots(d); };

  const rating = pseudoRating(doctor?.name || "");

  if (!open || !doctor || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-[scaleIn_.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center gap-4 px-6 py-5 bg-gradient-to-r from-blue-600 to-cyan-500 shrink-0">
          <div className={`w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center text-white font-bold text-2xl shrink-0`}>
            {doctor.profilePicture
              ? <img src={doctor.profilePicture} alt={doctor.name} className="w-full h-full rounded-2xl object-cover" />
              : getInitials(doctor.name)
            }
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-bold text-white">{doctor.name}</h2>
            <p className="text-blue-100 text-sm">{doctor.specialty} · {doctor.experience ? `${doctor.experience} yrs exp` : ""}</p>
            <div className="flex items-center gap-3 mt-1.5">
              <StarRating rating={rating} />
              {doctor.consultationFee > 0 && (
                <span className="text-white/80 text-xs font-semibold">${doctor.consultationFee} / visit</span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/20 hover:bg-white/30 text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">

            {/* Left: doctor info */}
            <div className="p-6 space-y-5">
              {/* Qualifications */}
              {(doctor.qualifications || []).length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Qualifications</p>
                  <div className="flex flex-wrap gap-1.5">
                    {doctor.qualifications.map((q, i) => (
                      <span key={i} className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200">{q}</span>
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
                      <span key={i} className="px-2.5 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg">{l}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Clinic address */}
              {doctor.clinicAddress && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Clinic Address</p>
                  <div className="flex items-start gap-2 px-3.5 py-3 bg-gray-50 rounded-xl border border-gray-100 text-sm text-gray-700">
                    <svg className="w-4 h-4 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                    </svg>
                    {doctor.clinicAddress}
                  </div>
                </div>
              )}

              {/* Bio */}
              {doctor.bio && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">About</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{doctor.bio}</p>
                </div>
              )}
            </div>

            {/* Right: availability + booking */}
            <div className="p-6 space-y-4">
              <p className="text-sm font-bold text-gray-900">Book an Appointment</p>

              {/* Date picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Select Date</label>
                <input type="date" value={date} min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                    focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition" />
              </div>

              {/* Slots */}
              {date && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Available Slots</p>
                  {loadSlots ? (
                    <div className="grid grid-cols-3 gap-2">
                      {[1,2,3,4,5,6].map((i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                      ))}
                    </div>
                  ) : slots.length === 0 ? (
                    <div className="flex flex-col items-center py-8 text-center">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-lg mb-2">📅</div>
                      <p className="text-xs text-gray-500 font-medium">No availability on this date</p>
                      <p className="text-xs text-gray-400">Try another date</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
                      {slots
                        .filter((s) => s.status !== "booked" && !s.isBooked)
                        .map((slot) => (
                          <button key={slot._id}
                            onClick={() => setSelSlot(selSlot?._id === slot._id ? null : slot)}
                            className={`py-2 px-1 rounded-xl text-xs font-bold border transition-all
                              ${selSlot?._id === slot._id
                                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 scale-105"
                                : "bg-white text-gray-700 border-gray-200 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
                              }`}>
                            {slot.startTime}
                          </button>
                        ))
                      }
                      {slots.filter((s) => s.status === "booked" || s.isBooked).map((slot) => (
                        <button key={slot._id} disabled
                          className="py-2 px-1 rounded-xl text-xs font-medium border border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed">
                          {slot.startTime}
                          <span className="block text-[9px]">Booked</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Confirm booking CTA */}
              {selSlot && date && (
                <div className="pt-2 border-t border-gray-100">
                  <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-xl border border-blue-100 mb-3">
                    <svg className="w-3.5 h-3.5 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>
                    <p className="text-xs text-blue-700 font-medium">
                      Selected: {new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" })} at {selSlot.startTime}
                    </p>
                  </div>
                  <button onClick={() => onBook(doctor, selSlot, date)}
                    className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
                      shadow-md shadow-blue-200 transition-colors flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
                    Confirm Booking
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DOCTOR CARD
// ─────────────────────────────────────────────────────────────────────────────

function DoctorCard({ doctor, onView, onBook }) {
  const rating = pseudoRating(doctor.name);
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-blue-100
      transition-all duration-200 overflow-hidden group flex flex-col">
      {/* Top gradient bar */}
      <div className={`h-1.5 w-full bg-gradient-to-r ${avatarColor(doctor.name)}`} />

      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Top row */}
        <div className="flex items-start gap-3">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${avatarColor(doctor.name)} flex items-center justify-center text-white font-bold text-base shrink-0 shadow-sm`}>
            {doctor.profilePicture
              ? <img src={doctor.profilePicture} alt={doctor.name} className="w-full h-full rounded-xl object-cover" />
              : getInitials(doctor.name)
            }
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{doctor.name}</p>
            <SpecBadge specialty={doctor.specialty} />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-blue-50 rounded-xl py-2">
            <p className="text-base font-bold text-blue-600">{doctor.experience ?? "—"}</p>
            <p className="text-[9px] text-blue-400 font-semibold">Yrs Exp</p>
          </div>
          <div className="bg-green-50 rounded-xl py-2">
            <p className="text-base font-bold text-green-600">
              {doctor.consultationFee != null ? `$${doctor.consultationFee}` : "—"}
            </p>
            <p className="text-[9px] text-green-400 font-semibold">Fee</p>
          </div>
          <div className="bg-amber-50 rounded-xl py-2">
            <p className="text-base font-bold text-amber-500">{rating}</p>
            <p className="text-[9px] text-amber-400 font-semibold">Rating</p>
          </div>
        </div>

        {/* Stars + qualifications */}
        <div className="space-y-2">
          <StarRating rating={rating} />
          <div className="flex flex-wrap gap-1">
            {(doctor.qualifications || []).slice(0, 3).map((q, i) => (
              <span key={i} className="px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-md">{q}</span>
            ))}
            {(doctor.qualifications || []).length > 3 && (
              <span className="text-[10px] text-gray-400 font-medium">+{doctor.qualifications.length - 3} more</span>
            )}
          </div>
        </div>

        {/* Languages */}
        {(doctor.languages || []).length > 0 && (
          <p className="text-xs text-gray-400 truncate">
            🌐 {doctor.languages.join(", ")}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-100">
          <button onClick={() => onView(doctor)}
            className="flex-1 py-2 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold
              hover:bg-gray-50 hover:border-blue-200 hover:text-blue-600 transition-colors">
            View Profile
          </button>
          <button onClick={() => onView(doctor)}
            className="flex-1 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold
              shadow-sm shadow-blue-200 transition-colors">
            Book Now
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function DoctorsPage() {
  const router = useRouter();

  const [doctors,  setDoctors]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [searched, setSearched] = useState(false);

  // Filters
  const [nameQ,     setNameQ]     = useState("");
  const [specialtyQ, setSpecialtyQ] = useState("All Specialties");
  const [dateQ,     setDateQ]     = useState("");

  // Modals
  const [profileDoc,  setProfileDoc]  = useState(null);
  const [bookingData, setBookingData] = useState(null); // { doctor, slot, date }
  const [successData, setSuccessData] = useState(null); // same shape
  const [booking,     setBooking]     = useState(false);

  // Toasts
  const toastRef = useRef(0);
  const [toasts, setToasts] = useState([]);
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((p) => [...p, { id, message, type }]);
    setTimeout(() => setToasts((p) => p.filter((t) => t.id !== id)), 4500);
  }, []);
  const removeToast = useCallback((id) => setToasts((p) => p.filter((t) => t.id !== id)), []);

  // ── Search ─────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(async () => {
    setLoading(true);
    setSearched(true);
    try {
      const params = {};
      if (nameQ.trim())                          params.name      = nameQ.trim();
      if (specialtyQ !== "All Specialties")       params.specialty = specialtyQ;
      if (dateQ)                                  params.date      = dateQ;

      const { data } = await axios.get(`${API_BASE}/doctors`, {
        params,
        headers: authHeaders(),
      });
      setDoctors(data.doctors || data || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load doctors", "error");
    } finally {
      setLoading(false);
    }
  }, [nameQ, specialtyQ, dateQ, addToast]);

  // Load all on mount
  useEffect(() => { handleSearch(); }, []); // eslint-disable-line

  // ── Book appointment ───────────────────────────────────────────────────────
  const handleBookConfirm = async ({ reason }) => {
    const { doctor, slot, date } = bookingData;
    setBooking(true);
    try {
      await axios.post(`${API_BASE}/appointments`, {
        doctorId:      doctor._id,
        availabilityId: slot._id,
        date,
        startTime:     slot.startTime,
        reason,
        type:          "in-person",
      }, { headers: authHeaders() });

      setBookingData(null);
      setSuccessData({ doctor, slot, date });
    } catch (err) {
      addToast(err.response?.data?.message || "Booking failed. Please try again.", "error");
    } finally {
      setBooking(false);
    }
  };

  const handleOpenBook = (doctor, slot, date) => {
    setProfileDoc(null);
    setBookingData({ doctor, slot, date });
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      <DoctorProfileModal
        open={!!profileDoc}
        doctor={profileDoc}
        onClose={() => setProfileDoc(null)}
        onBook={handleOpenBook}
      />
      <BookingModal
        open={!!bookingData}
        doctor={bookingData?.doctor}
        slot={bookingData?.slot}
        date={bookingData?.date}
        onClose={() => setBookingData(null)}
        onConfirm={handleBookConfirm}
        booking={booking}
      />
      <BookingSuccess
        open={!!successData}
        doctor={successData?.doctor}
        date={successData?.date}
        slot={successData?.slot}
        onClose={() => setSuccessData(null)}
        onDashboard={() => router.push("/dashboard")}
      />

      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50">
        {/* ── Hero / search bar ─────────────────────────────────────────── */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 px-4 sm:px-6 pt-12 pb-20">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2">Find Your Doctor</h1>
            <p className="text-blue-200 text-base mb-8">Search from our network of verified healthcare professionals</p>

            {/* Search card */}
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row gap-3">
                {/* Name */}
                <div className="relative flex-1">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300 pointer-events-none"
                    fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" value={nameQ} onChange={(e) => setNameQ(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Search doctor name…"
                    className="w-full pl-9 pr-4 py-3 rounded-xl bg-white/20 backdrop-blur border border-white/30
                      text-white placeholder-blue-200 text-sm focus:outline-none focus:ring-2 focus:ring-white/50" />
                </div>
                {/* Specialty */}
                <select value={specialtyQ} onChange={(e) => setSpecialtyQ(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/20 backdrop-blur border border-white/30
                    text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50 cursor-pointer
                    [&>option]:text-gray-800 [&>option]:bg-white">
                  {SPECIALTIES.map((s) => <option key={s}>{s}</option>)}
                </select>
                {/* Date */}
                <input type="date" value={dateQ} min={new Date().toISOString().split("T")[0]}
                  onChange={(e) => setDateQ(e.target.value)}
                  className="px-4 py-3 rounded-xl bg-white/20 backdrop-blur border border-white/30
                    text-white text-sm focus:outline-none focus:ring-2 focus:ring-white/50" />
                {/* Search btn */}
                <button onClick={handleSearch} disabled={loading}
                  className="px-6 py-3 rounded-xl bg-white text-blue-600 text-sm font-bold
                    hover:bg-blue-50 disabled:opacity-70 shadow-lg transition-colors whitespace-nowrap
                    flex items-center gap-2">
                  {loading
                    ? <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>
                    : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
                  }
                  Search
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Results ───────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 -mt-8 pb-12">
          {/* Count bar */}
          <div className="flex items-center justify-between mb-5">
            <p className="text-sm font-semibold text-gray-700">
              {loading ? "Searching…" : `${doctors.length} doctor${doctors.length !== 1 ? "s" : ""} found`}
            </p>
            {(nameQ || specialtyQ !== "All Specialties" || dateQ) && (
              <button onClick={() => { setNameQ(""); setSpecialtyQ("All Specialties"); setDateQ(""); handleSearch(); }}
                className="text-xs text-blue-600 font-semibold hover:underline">
                Clear filters
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gray-200" />
                    <div className="flex-1 space-y-2"><div className="h-3.5 w-28 bg-gray-200 rounded"/><div className="h-4 w-20 bg-gray-100 rounded-full"/></div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">{[1,2,3].map((j) => <div key={j} className="h-14 bg-gray-100 rounded-xl"/>)}</div>
                  <div className="flex gap-2 border-t border-gray-100 pt-3">{[1,2].map((j) => <div key={j} className="flex-1 h-8 bg-gray-100 rounded-xl"/>)}</div>
                </div>
              ))}
            </div>
          ) : doctors.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-blue-100 flex items-center justify-center text-2xl mb-4">🔍</div>
              <p className="text-base font-bold text-gray-800">No doctors found</p>
              <p className="text-sm text-gray-400 mt-1 max-w-xs">
                {searched ? "Try adjusting your search filters" : "Start by searching for a doctor"}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {doctors.map((doc) => (
                <DoctorCard key={doc._id} doctor={doc}
                  onView={setProfileDoc}
                  onBook={(d) => setProfileDoc(d)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }
        @keyframes slideUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>
    </>
  );
}
