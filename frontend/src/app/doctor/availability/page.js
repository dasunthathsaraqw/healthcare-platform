"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

// ── Constants ─────────────────────────────────────────────────────────────────
const DAYS = [
  { label: "Monday",    short: "Mon", dow: 1 },
  { label: "Tuesday",   short: "Tue", dow: 2 },
  { label: "Wednesday", short: "Wed", dow: 3 },
  { label: "Thursday",  short: "Thu", dow: 4 },
  { label: "Friday",    short: "Fri", dow: 5 },
  { label: "Saturday",  short: "Sat", dow: 6 },
  { label: "Sunday",    short: "Sun", dow: 0 },
];

const DURATIONS = [15, 30, 45, 60];

/** Generate time options in HH:MM, every 30 minutes */
function generateTimeOptions() {
  const opts = [];
  for (let h = 0; h < 24; h++) {
    for (let m = 0; m < 60; m += 30) {
      const hh = String(h).padStart(2, "0");
      const mm = String(m).padStart(2, "0");
      opts.push(`${hh}:${mm}`);
    }
  }
  return opts;
}
const TIME_OPTIONS = generateTimeOptions();

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${token}` };
}

// ── Blank form state ──────────────────────────────────────────────────────────
const BLANK_FORM = {
  mode: "recurring",        // "recurring" | "specific"
  dayOfWeek: 1,             // 1 = Monday
  specificDate: "",
  startTime: "09:00",
  endTime: "17:00",
  slotDuration: 30,
  isRecurring: true,
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toasts, removeToast }) {
  if (typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed bottom-5 right-5 z-[200] flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium
            animate-[fadeSlideUp_0.25s_ease-out]
            ${t.type === "success"
              ? "bg-green-600 text-white"
              : t.type === "error"
              ? "bg-red-600 text-white"
              : "bg-gray-800 text-white"
            }`}
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
          {t.message}
          <button
            onClick={() => removeToast(t.id)}
            className="ml-1 opacity-70 hover:opacity-100"
            aria-label="Dismiss"
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

// ── Modal ──────────────────────────────────────────────────────────────────────
function SlotModal({ open, onClose, onSave, editSlot, saving }) {
  const [form, setForm] = useState(BLANK_FORM);
  const firstRef = useRef(null);

  // Populate form from editSlot
  useEffect(() => {
    if (!open) return;
    if (editSlot) {
      setForm({
        mode: editSlot.specificDate ? "specific" : "recurring",
        dayOfWeek: editSlot.dayOfWeek ?? 1,
        specificDate: editSlot.specificDate
          ? new Date(editSlot.specificDate).toISOString().split("T")[0]
          : "",
        startTime: editSlot.startTime || "09:00",
        endTime: editSlot.endTime || "17:00",
        slotDuration: editSlot.slotDuration || 30,
        isRecurring: editSlot.isRecurring !== false,
      });
    } else {
      setForm(BLANK_FORM);
    }
    setTimeout(() => firstRef.current?.focus(), 50);
  }, [open, editSlot]);

  const set = (key, val) => setForm((p) => ({ ...p, [key]: val }));

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      startTime: form.startTime,
      endTime: form.endTime,
      slotDuration: Number(form.slotDuration),
      isRecurring: form.mode === "recurring" ? form.isRecurring : false,
      dayOfWeek: form.mode === "recurring" ? Number(form.dayOfWeek) : null,
      specificDate: form.mode === "specific" ? form.specificDate : null,
    };
    onSave(payload);
  };

  if (!open) return null;
  if (typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-[scaleIn_0.2s_ease-out]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50">
          <div>
            <h2 className="text-base font-bold text-gray-900">
              {editSlot ? "Edit Availability Slot" : "Add Availability Slot"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Define when patients can book appointments
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">

          {/* Mode toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200 p-1 gap-1 bg-gray-50">
            {[
              { id: "recurring", label: "Recurring Weekly" },
              { id: "specific",  label: "Specific Date" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => set("mode", m.id)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-all duration-150
                  ${form.mode === m.id
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                  }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Recurring: Day of week */}
          {form.mode === "recurring" && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Day of Week
              </label>
              <select
                ref={firstRef}
                value={form.dayOfWeek}
                onChange={(e) => set("dayOfWeek", Number(e.target.value))}
                className="select-field"
              >
                {DAYS.map((d) => (
                  <option key={d.dow} value={d.dow}>{d.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Specific: Date picker */}
          {form.mode === "specific" && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Specific Date
              </label>
              <input
                ref={firstRef}
                type="date"
                value={form.specificDate}
                onChange={(e) => set("specificDate", e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required={form.mode === "specific"}
                className="input-field"
              />
            </div>
          )}

          {/* Start / End time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                Start Time
              </label>
              <select
                value={form.startTime}
                onChange={(e) => set("startTime", e.target.value)}
                className="select-field"
              >
                {TIME_OPTIONS.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
                End Time
              </label>
              <select
                value={form.endTime}
                onChange={(e) => set("endTime", e.target.value)}
                className="select-field"
              >
                {TIME_OPTIONS.filter((t) => t > form.startTime).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Slot duration */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5 uppercase tracking-wide">
              Slot Duration
            </label>
            <div className="flex gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => set("slotDuration", d)}
                  className={`flex-1 py-2 text-xs font-bold rounded-lg border transition-all
                    ${form.slotDuration === d
                      ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                      : "border-gray-200 text-gray-500 hover:border-blue-300 hover:text-blue-600"
                    }`}
                >
                  {d} min
                </button>
              ))}
            </div>
          </div>

          {/* Recurring checkbox (only for recurring mode) */}
          {form.mode === "recurring" && (
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={form.isRecurring}
                  onChange={(e) => set("isRecurring", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-gray-200 peer-checked:bg-blue-600 rounded-full transition-colors" />
                <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all peer-checked:translate-x-4" />
              </div>
              <span className="text-sm text-gray-700 font-medium">Repeat every week</span>
            </label>
          )}

          {/* Slot count preview */}
          {form.startTime && form.endTime && form.endTime > form.startTime && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-center gap-2.5">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs text-blue-700">
                <strong>
                  {Math.floor(
                    (timeToMins(form.endTime) - timeToMins(form.startTime)) /
                    form.slotDuration
                  )}
                </strong>{" "}
                appointment slots will be created ({form.slotDuration} min each)
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600
                hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold
                disabled:opacity-60 transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Saving…
                </>
              ) : (
                editSlot ? "Update Slot" : "Add Slot"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

// ── Delete confirm modal ───────────────────────────────────────────────────────
function DeleteConfirmModal({ open, onClose, onConfirm, deleting }) {
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-6 animate-[scaleIn_0.15s_ease-out]">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 text-center mb-2">Delete Slot?</h3>
        <p className="text-sm text-gray-500 text-center mb-6">
          This availability slot will be permanently removed. Patients won&apos;t be able to book it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-semibold
              disabled:opacity-60 flex items-center justify-center gap-2 shadow-md shadow-red-200"
          >
            {deleting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Deleting…
              </>
            ) : (
              "Delete"
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Slot card ─────────────────────────────────────────────────────────────────
function SlotCard({ slot, onEdit, onDelete }) {
  const isBooked = slot.isBooked || slot.status === "booked";
  const isUnavailable = slot.status === "unavailable";

  return (
    <div
      className={`group relative rounded-xl p-3 border cursor-pointer
        transition-all duration-150 hover:shadow-md
        ${isBooked
          ? "bg-gray-50 border-gray-200 hover:border-gray-300"
          : isUnavailable
          ? "bg-orange-50 border-orange-200"
          : "bg-green-50 border-green-200 hover:border-green-400"
        }`}
      onClick={() => !isBooked && onEdit(slot)}
    >
      {/* Time */}
      <p className={`text-[11px] font-bold ${isBooked ? "text-gray-500" : "text-green-700"}`}>
        {slot.startTime} – {slot.endTime}
      </p>

      {/* Duration */}
      <p className="text-[10px] text-gray-400 mt-0.5">
        {slot.slotDuration} min slots
      </p>

      {/* Status badge */}
      <div className="flex items-center justify-between mt-2">
        <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md
          ${isBooked
            ? "bg-gray-200 text-gray-500"
            : isUnavailable
            ? "bg-orange-100 text-orange-600"
            : "bg-green-100 text-green-600"
          }`}>
          {isBooked ? "Booked" : isUnavailable ? "Unavailable" : "Available"}
        </span>

        {/* Delete button */}
        {!isBooked && (
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(slot); }}
            className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-100 text-red-400 hover:text-red-600 transition-all"
            aria-label="Delete slot"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        )}
      </div>

      {/* Recurring badge */}
      {slot.isRecurring && (
        <div className="absolute top-2 right-2">
          <svg className="w-3 h-3 text-green-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
        </div>
      )}
    </div>
  );
}

// ── Utility ───────────────────────────────────────────────────────────────────
function timeToMins(t = "00:00") {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function getDowForDate(dateStr) {
  return new Date(dateStr).getDay();
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AvailabilityPage() {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSlot, setEditSlot] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toasts, setToasts] = useState([]);

  const toastRef = useRef(0);

  // ── Toast helpers ──────────────────────────────────────────────────────────
  const addToast = useCallback((message, type = "info") => {
    const id = ++toastRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── Fetch availability ─────────────────────────────────────────────────────
  const fetchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/availability`, {
        headers: authHeaders(),
      });
      setSlots(data.availability || []);
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to load availability", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // ── Add / Update slot ──────────────────────────────────────────────────────
  const handleSave = async (payload) => {
    setSaving(true);
    try {
      if (editSlot) {
        await axios.put(
          `${API_BASE}/doctors/availability/${editSlot._id}`,
          payload,
          { headers: authHeaders() }
        );
        addToast("Slot updated successfully", "success");
      } else {
        await axios.post(`${API_BASE}/doctors/availability`, payload, {
          headers: authHeaders(),
        });
        addToast("Slot added successfully", "success");
      }
      setModalOpen(false);
      setEditSlot(null);
      fetchSlots();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to save slot", "error");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete slot ────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await axios.delete(`${API_BASE}/doctors/availability/${deleteTarget._id}`, {
        headers: authHeaders(),
      });
      addToast("Slot deleted", "success");
      setDeleteTarget(null);
      fetchSlots();
    } catch (err) {
      addToast(err.response?.data?.message || "Failed to delete slot", "error");
    } finally {
      setDeleting(false);
    }
  };

  const openAdd = () => { setEditSlot(null); setModalOpen(true); };
  const openEdit = (slot) => { setEditSlot(slot); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditSlot(null); };

  // ── Group slots by day-of-week ─────────────────────────────────────────────
  const slotsByDow = DAYS.reduce((acc, d) => {
    acc[d.dow] = slots.filter((s) => {
      if (s.dayOfWeek !== null && s.dayOfWeek !== undefined) {
        return s.dayOfWeek === d.dow;
      }
      if (s.specificDate) {
        return getDowForDate(s.specificDate) === d.dow;
      }
      return false;
    });
    return acc;
  }, {});

  const totalSlots  = slots.length;
  const bookedSlots = slots.filter((s) => s.isBooked || s.status === "booked").length;
  const freeSlots   = totalSlots - bookedSlots;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Modals (portaled) ──────────────────────────────────────────────── */}
      <SlotModal
        open={modalOpen}
        onClose={closeModal}
        onSave={handleSave}
        editSlot={editSlot}
        saving={saving}
      />
      <DeleteConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        deleting={deleting}
      />
      <Toast toasts={toasts} removeToast={removeToast} />

      {/* ── Page ───────────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Manage Availability</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              Set when patients can book appointments with you
            </p>
          </div>
          <button
            id="add-slot-btn"
            onClick={openAdd}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700
              text-white text-sm font-semibold shadow-md shadow-blue-200 transition-colors self-start sm:self-auto"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Add Availability Slot
          </button>
        </div>

        {/* Summary bar */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total Slots",     value: totalSlots,  color: "blue"  },
            { label: "Available",       value: freeSlots,   color: "green" },
            { label: "Booked",          value: bookedSlots, color: "gray"  },
          ].map((s) => (
            <div
              key={s.label}
              className={`bg-white rounded-xl border border-gray-100 px-4 py-3 text-center shadow-sm`}
            >
              <p className="text-xl font-bold text-gray-900">
                {loading ? <span className="inline-block w-6 h-5 bg-gray-200 rounded animate-pulse" /> : s.value}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-200 border border-green-400" />
            <span>Available</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-200 border border-gray-300" />
            <span>Booked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <svg className="w-3 h-3 text-green-500" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            <span>Recurring</span>
          </div>
          <p className="ml-auto text-gray-400 hidden sm:block">
            Click a slot to edit · hover to delete
          </p>
        </div>

        {/* ── Week calendar grid ──────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-7 gap-3">
            {DAYS.map((d) => (
              <div key={d.dow} className="space-y-2">
                <div className="h-8 bg-gray-100 rounded-xl animate-pulse" />
                <div className="h-20 bg-gray-50 rounded-xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-x-auto">
            <div className="grid grid-cols-7 min-w-[700px]" style={{ gridTemplateColumns: "repeat(7, minmax(0, 1fr))" }}>
              {DAYS.map((day, idx) => {
                const daySlots = slotsByDow[day.dow] || [];
                const isToday = new Date().getDay() === day.dow;

                return (
                  <div
                    key={day.dow}
                    className={`border-r border-gray-100 last:border-r-0 ${isToday ? "bg-blue-50/40" : ""}`}
                  >
                    {/* Day header */}
                    <div
                      className={`px-3 py-3 border-b border-gray-100 text-center
                        ${isToday ? "bg-blue-600" : "bg-gray-50"}`}
                    >
                      <p className={`text-xs font-bold uppercase tracking-wider ${isToday ? "text-white" : "text-gray-500"}`}>
                        {day.short}
                      </p>
                      {isToday && (
                        <p className="text-[9px] text-blue-200 font-medium mt-0.5">Today</p>
                      )}
                    </div>

                    {/* Slots */}
                    <div className="p-2 space-y-2 min-h-[120px]">
                      {daySlots.length === 0 ? (
                        <div
                          className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-gray-200
                            cursor-pointer group hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                          onClick={openAdd}
                        >
                          <svg className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                          </svg>
                          <p className="text-[10px] text-gray-300 group-hover:text-blue-400 mt-1 transition-colors">Add</p>
                        </div>
                      ) : (
                        daySlots.map((slot) => (
                          <SlotCard
                            key={slot._id}
                            slot={slot}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                          />
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── List view for specific-date slots ──────────────────────────── */}
        {(() => {
          const specificSlots = slots.filter((s) => s.specificDate && !s.dayOfWeek && s.dayOfWeek !== 0);
          if (specificSlots.length === 0) return null;
          return (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 bg-amber-50/50">
                <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Specific Date Slots
                </h2>
              </div>
              <div className="divide-y divide-gray-100">
                {specificSlots.map((slot) => (
                  <div
                    key={slot._id}
                    className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="text-center w-16">
                        <p className="text-xs font-bold text-gray-900">
                          {new Date(slot.specificDate).toLocaleDateString("en-US", { month:"short", day:"numeric" })}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(slot.specificDate).toLocaleDateString("en-US", { weekday:"short" })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-gray-800">
                          {slot.startTime} – {slot.endTime}
                        </p>
                        <p className="text-xs text-gray-400">{slot.slotDuration} min slots</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full
                        ${slot.isBooked || slot.status === "booked"
                          ? "bg-gray-100 text-gray-500"
                          : "bg-green-100 text-green-600"
                        }`}>
                        {slot.isBooked || slot.status === "booked" ? "Booked" : "Available"}
                      </span>
                      <button
                        onClick={() => openEdit(slot)}
                        className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-400 hover:text-blue-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(slot)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      </div>

      {/* ── Inline styles for portal animations & shared field classes ──── */}
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .input-field {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .input-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
        .select-field {
          width: 100%;
          padding: 0.65rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: #f9fafb;
          font-size: 0.875rem;
          color: #111827;
          outline: none;
          cursor: pointer;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .select-field:focus {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.15);
        }
      `}</style>
    </>
  );
}
