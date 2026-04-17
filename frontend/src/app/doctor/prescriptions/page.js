"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import axios from "axios";
import AIPrescriptionSuggestions from "@/app/doctor/components/AIPrescriptionSuggestions"


const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";
const PAGE_SIZE = 10;

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
function getInitials(name = "") {
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?";
}

const BLANK_MED = { name: "", dosage: "", frequency: "", duration: "", instructions: "" };

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATION ROW (for prescription form)
// ─────────────────────────────────────────────────────────────────────────────

function MedicationRow({ med, idx, onChange, onDelete }) {
  const input = (field, placeholder, cls = "col-span-1") => (
    <input
      type="text"
      placeholder={placeholder}
      value={med[field]}
      onChange={(e) => onChange(idx, field, e.target.value)}
      className={`${cls} px-2.5 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-800 placeholder-gray-400
        focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent bg-white transition`}
    />
  );
  return (
    <div className="relative bg-blue-50 border border-blue-100 rounded-xl p-3 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Med #{idx + 1}</span>
        <button onClick={() => onDelete(idx)} className="p-1 rounded-lg hover:bg-red-100 text-red-400 hover:text-red-600 transition-colors">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
        </button>
      </div>
      <div className="grid grid-cols-2 gap-1.5">
        {input("name", "Medication name", "col-span-2")}
        {input("dosage", "Dosage (e.g. 500mg)")}
        {input("frequency", "Frequency (twice daily)")}
        {input("duration", "Duration (7 days)")}
        {input("instructions", "Instructions (after meals)", "col-span-2")}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW PRESCRIPTION MODAL (for creating prescriptions for a patient)
// ─────────────────────────────────────────────────────────────────────────────

function NewPrescriptionModal({ open, patient, onClose, onSuccess }) {
  const [rx, setRx] = useState({
    diagnosis: "",
    medications: [],
    notes: "",
    followUpDate: "",
  });
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState(null);


  const addMed = () => setRx((p) => ({ ...p, medications: [...p.medications, { ...BLANK_MED }] }));
  const delMed = (i) => setRx((p) => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }));
  const chgMed = (i, field, val) =>
    setRx((p) => ({ ...p, medications: p.medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));

  const handleApplySuggestion = (suggestion) => {
    if (suggestion.type === "medication") {
      setRx((prev) => ({
        ...prev,
        medications: [...prev.medications, suggestion.data],
      }));
    } else if (suggestion.type === "diagnosis") {
      setRx((prev) => ({
        ...prev,
        diagnosis: prev.diagnosis
          ? `${prev.diagnosis}\n\nSuggested: ${suggestion.data}`
          : `Suggested: ${suggestion.data}`,
      }));
    }
  };

  const resetForm = () => {
    setRx({
      diagnosis: "",
      medications: [],
      notes: "",
      followUpDate: "",
    });
    setErrors({});
  };

  useEffect(() => {
    if (open) resetForm();
  }, [open]);

  const handleSubmit = async () => {
    const errs = {};
    if (!rx.diagnosis.trim()) errs.diagnosis = "Diagnosis is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSaving(true);
    try {
      await axios.post(`${API_BASE}/doctors/prescriptions`, {
        patientId: patient._id,
        diagnosis: rx.diagnosis,
        medications: rx.medications,
        notes: rx.notes,
        followUpDate: rx.followUpDate || undefined,
      }, { headers: authHeaders() });

      onSuccess();
      onClose();
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || "Failed to create prescription" });
    } finally {
      setSaving(false);
    }
  };

  if (!open || !patient || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-sm shrink-0">
            {getInitials(patient.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-base font-bold text-gray-900">New Prescription</p>
            <p className="text-xs text-gray-500">for {patient.name}</p>
          </div>
          <button
            onClick={() => setShowAIPanel(!showAIPanel)}
            className={`p-2 rounded-lg transition-colors ${showAIPanel
              ? "bg-indigo-100 text-indigo-600"
              : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              }`}
            title="AI Assistant"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
          </button>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {errors.submit && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
              {errors.submit}
            </div>
          )}

          {/* Diagnosis */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Diagnosis <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={3}
              value={rx.diagnosis}
              onChange={(e) => { setRx((p) => ({ ...p, diagnosis: e.target.value })); setErrors((p) => ({ ...p, diagnosis: "" })); }}
              placeholder="Primary diagnosis and observations…"
              className={`w-full px-3 py-2.5 rounded-xl border text-sm text-gray-800 placeholder-gray-400 resize-none
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition
                ${errors.diagnosis ? "border-red-300 bg-red-50" : "border-gray-200"}`}
            />
            {errors.diagnosis && <p className="text-xs text-red-500 mt-1">{errors.diagnosis}</p>}
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">
                Medications ({rx.medications.length})
              </label>
              <button onClick={addMed}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold transition-colors shadow-sm">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                Add Medication
              </button>
            </div>
            {rx.medications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 border-2 border-dashed border-gray-200 rounded-xl">
                <p className="text-xs text-gray-400">No medications added yet</p>
                <button onClick={addMed} className="text-xs text-blue-500 hover:text-blue-600 font-medium mt-1">+ Add one</button>
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {rx.medications.map((med, i) => (
                  <MedicationRow key={i} med={med} idx={i} onChange={chgMed} onDelete={delMed} />
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Additional Notes
            </label>
            <textarea
              rows={2}
              value={rx.notes}
              onChange={(e) => setRx((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Rest recommendations, lifestyle advice…"
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition"
            />
          </div>

          {/* Follow-up date */}
          <div>
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1.5">
              Follow-up Date <span className="text-gray-300">(optional)</span>
            </label>
            <input
              type="date"
              value={rx.followUpDate}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setRx((p) => ({ ...p, followUpDate: e.target.value }))}
              className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 transition"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
              disabled:opacity-60 transition-colors shadow-md shadow-blue-200 flex items-center justify-center gap-2">
            {saving ? (
              <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>
            ) : (
              <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Issue Prescription</>
            )}
          </button>
        </div>
      </div>
      <AIPrescriptionSuggestions
        isOpen={showAIPanel}
        onClose={() => setShowAIPanel(false)}
        patient={patient}
        currentPrescriptionData={rx}
        onSuggestionApply={handleApplySuggestion}
      />
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT PRESCRIPTIONS MODAL (shows all prescriptions for a patient)
// ─────────────────────────────────────────────────────────────────────────────

function PatientPrescriptionsModal({ open, patient, prescriptions, onClose, onNewPrescription }) {
  const [selectedRx, setSelectedRx] = useState(null);

  if (!open || !patient || typeof window === "undefined") return null;

  const sortedPrescriptions = [...prescriptions].sort((a, b) =>
    new Date(b.issuedAt) - new Date(a.issuedAt)
  );

  return (
    <>
      <PrescriptionDetailModal
        open={!!selectedRx}
        rx={selectedRx}
        onClose={() => setSelectedRx(null)}
      />

      {createPortal(
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
          <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_.2s_ease-out]">

            {/* Header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-base shrink-0">
                {getInitials(patient.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-lg font-bold text-gray-900">{patient.name}</p>
                <p className="text-xs text-gray-500">
                  {prescriptions.length} prescription{prescriptions.length !== 1 ? "s" : ""} ·
                  Last issued: {fmtDate(sortedPrescriptions[0]?.issuedAt)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNewPrescription(patient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  New Prescription
                </button>
                <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Prescriptions list */}
            <div className="flex-1 overflow-y-auto p-6">
              {sortedPrescriptions.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 font-medium">No prescriptions yet</p>
                  <p className="text-sm text-gray-400 mt-1">Click "New Prescription" to create one</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedPrescriptions.map((rx, idx) => (
                    <div key={rx._id} className="bg-white border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                      {/* Prescription card header */}
                      <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold text-gray-400">#{prescriptions.length - idx}</span>
                          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
                            {fmtDate(rx.issuedAt)}
                          </span>
                          {rx.followUpDate && (
                            <span className="px-2.5 py-1 bg-amber-100 text-amber-700 text-xs font-semibold rounded-full">
                              Follow-up: {fmtDate(rx.followUpDate)}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => setSelectedRx(rx)}
                          className="px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors"
                        >
                          View Details
                        </button>
                      </div>

                      {/* Prescription content preview */}
                      <div className="p-4 space-y-3">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Diagnosis</p>
                          <p className="text-sm text-gray-800">{rx.diagnosis}</p>
                        </div>

                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                            Medications ({(rx.medications || []).length})
                          </p>
                          <div className="space-y-2">
                            {(rx.medications || []).slice(0, 2).map((m, i) => (
                              <div key={i} className="flex items-start gap-2 text-sm">
                                <span className="text-blue-500">•</span>
                                <div className="flex-1">
                                  <span className="font-medium text-gray-800">{m.name}</span>
                                  <span className="text-gray-500 text-xs ml-2">
                                    {[m.dosage, m.frequency].filter(Boolean).join(" · ")}
                                  </span>
                                </div>
                              </div>
                            ))}
                            {(rx.medications || []).length > 2 && (
                              <p className="text-xs text-gray-400 ml-4">
                                +{(rx.medications || []).length - 2} more medication(s)
                              </p>
                            )}
                          </div>
                        </div>

                        {rx.notes && (
                          <div className="bg-amber-50 border border-amber-100 rounded-lg p-2">
                            <p className="text-xs text-amber-700 line-clamp-2">{rx.notes}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION DETAIL MODAL (single prescription view with print)
// ─────────────────────────────────────────────────────────────────────────────

function PrescriptionDetailModal({ open, rx, onClose }) {
  const printRef = useRef(null);

  const handlePrint = () => {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(`
      <html><head><title>Prescription – ${rx?.diagnosis}</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; padding: 32px; color: #1a1a2e; }
        h1 { font-size: 20px; margin-bottom: 4px; }
        .meta { color: #666; font-size: 13px; margin-bottom: 24px; }
        .section { margin-bottom: 20px; }
        .section h3 { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; color: #888; margin-bottom: 8px; }
        .med { background: #f0f7ff; border: 1px solid #cde; border-radius: 8px; padding: 10px 14px; margin-bottom: 8px; }
        .med p { margin: 2px 0; font-size: 13px; }
        .badge { font-size: 11px; background: #e8f0fe; color: #1a56db; padding: 2px 8px; border-radius: 20px; display: inline-block; }
        hr { border: none; border-top: 1px solid #eee; margin: 20px 0; }
        @media print { button { display: none !important; } }
      </style></head><body>
      <h1>Prescription</h1>
      <div class="meta">
        Patient: <strong>${rx?.patientId?.name || rx?.patientName || "—"}</strong> &nbsp;·&nbsp;
        Issued: <strong>${fmtDate(rx?.issuedAt)}</strong>
        ${rx?.followUpDate ? `&nbsp;·&nbsp; Follow-up: <strong>${fmtDate(rx.followUpDate)}</strong>` : ""}
      </div>
      <div class="section"><h3>Diagnosis</h3><p>${rx?.diagnosis || "—"}</p></div>
      <div class="section"><h3>Medications</h3>
        ${(rx?.medications || []).map((m) => `
          <div class="med">
            <p><strong>${m.name}</strong></p>
            <p>${[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}</p>
            ${m.instructions ? `<p style="color:#d97706;font-size:12px">${m.instructions}</p>` : ""}
          </div>`).join("")}
      </div>
      ${rx?.notes ? `<div class="section"><h3>Notes</h3><p>${rx.notes}</p></div>` : ""}
      <hr/>
      <p style="font-size:11px;color:#aaa">Generated by MediCare Doctor Portal</p>
      <script>window.onload = () => { window.print(); window.close(); }</script>
      </body></html>
    `);
    w.document.close();
  };

  if (!open || !rx || typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div ref={printRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-[scaleIn_.2s_ease-out]">

        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-gray-900 truncate">{rx.diagnosis}</p>
            <p className="text-xs text-gray-500">
              {rx.patientId?.name || rx.patientName || "Patient"} · {fmtDate(rx.issuedAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-blue-200 text-blue-600 text-xs font-bold hover:bg-blue-50 transition-colors">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
              Print
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-blue-50 text-blue-700 text-xs font-semibold rounded-full border border-blue-200">
              Issued: {fmtDate(rx.issuedAt)}
            </span>
            {rx.followUpDate && (
              <span className="px-3 py-1 bg-amber-50 text-amber-700 text-xs font-semibold rounded-full border border-amber-200">
                Follow-up: {fmtDate(rx.followUpDate)}
              </span>
            )}
          </div>

          {/* Diagnosis */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Diagnosis</p>
            <div className="px-4 py-3 bg-gray-50 rounded-xl border border-gray-200 text-sm text-gray-800">{rx.diagnosis}</div>
          </div>

          {/* Medications */}
          <div>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
              Medications ({(rx.medications || []).length})
            </p>
            <div className="space-y-2">
              {(rx.medications || []).length === 0
                ? <p className="text-sm text-gray-400 italic">No medications prescribed</p>
                : rx.medications.map((m, i) => (
                  <div key={i} className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-bold text-gray-900">{m.name}</p>
                      <span className="text-[10px] font-bold text-blue-600 bg-blue-100 px-2 py-0.5 rounded-md shrink-0">
                        #{i + 1}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                      {[[m.dosage, "Dosage"], [m.frequency, "Frequency"], [m.duration, "Duration"]].map(([val, lbl]) =>
                        val ? <p key={lbl} className="text-xs text-gray-500"><span className="font-medium text-gray-700">{val}</span> <span className="text-gray-400">({lbl})</span></p> : null
                      )}
                    </div>
                    {m.instructions && (
                      <p className="text-xs text-amber-700 mt-1.5 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-100">
                        📋 {m.instructions}
                      </p>
                    )}
                  </div>
                ))
              }
            </div>
          </div>

          {/* Notes */}
          {rx.notes && (
            <div>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Additional Notes</p>
              <div className="px-4 py-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-gray-700">{rx.notes}</div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT GROUP CARD (for grouped view)
// ─────────────────────────────────────────────────────────────────────────────

function PatientGroupCard({ patient, prescriptions, onViewAll, onNewPrescription }) {
  const latestPrescription = prescriptions[0]; // Most recent
  const prescriptionCount = prescriptions.length;

  return (
    <div className="bg-white rounded-xl border border-gray-200 hover:shadow-md transition-all">
      <div className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white font-bold text-base">
              {getInitials(patient.name)}
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900">{patient.name}</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {prescriptionCount} prescription{prescriptionCount !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <span className="px-2.5 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
            Last: {fmtDate(latestPrescription.issuedAt)}
          </span>
        </div>

        {/* Latest prescription preview */}
        <div className="space-y-2 cursor-pointer" onClick={() => onViewAll(patient, prescriptions)}>
          <div className="flex items-start gap-2">
            <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">Latest Dx:</span>
            <p className="text-sm text-gray-700 line-clamp-2 flex-1">{latestPrescription.diagnosis}</p>
          </div>

          {(latestPrescription.medications || []).length > 0 && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase mt-0.5">R x:</span>
              <div className="flex-1">
                <p className="text-xs text-gray-600">
                  {latestPrescription.medications.slice(0, 2).map(m => m.name).join(", ")}
                  {(latestPrescription.medications || []).length > 2 &&
                    ` +${latestPrescription.medications.length - 2} more`
                  }
                </p>
              </div>
            </div>
          )}

          {latestPrescription.followUpDate && (
            <div className="flex items-start gap-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase">Follow-up:</span>
              <p className="text-xs text-amber-600">{fmtDate(latestPrescription.followUpDate)}</p>
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-100 flex gap-2">
          <button
            onClick={() => onViewAll(patient, prescriptions)}
            className="flex-1 py-2 rounded-lg text-blue-600 text-xs font-semibold hover:bg-blue-50 transition-colors"
          >
            View All →
          </button>
          <button
            onClick={() => onNewPrescription(patient)}
            className="flex-1 py-2 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 transition-colors shadow-sm"
          >
            + New Rx
          </button>
        </div>
      </div>
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
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-xs">‹</button>
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
          <button key={i} onClick={() => onChange(pageNum)}
            className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors
              ${pageNum === page ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
            {pageNum}
          </button>
        );
      })}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40 text-xs">›</button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grouped"); // "grouped" or "list"
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedPatientPrescriptions, setSelectedPatientPrescriptions] = useState([]);
  const [showNewPrescriptionModal, setShowNewPrescriptionModal] = useState(false);
  const [selectedPatientForRx, setSelectedPatientForRx] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/prescriptions`, { headers: authHeaders() });
      setPrescriptions(data.prescriptions || data || []);
    } catch (err) {
      console.error("Prescriptions fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  // Client-side filter
  const filtered = prescriptions.filter((rx) => {
    const name = (rx.patientId?.name || rx.patientName || "").toLowerCase();
    const meds = (rx.medications || []).map((m) => m.name?.toLowerCase()).join(" ");
    const q = search.toLowerCase();
    const matchSearch = !search || name.includes(q) || meds.includes(q) || rx.diagnosis?.toLowerCase().includes(q);
    const issued = rx.issuedAt ? new Date(rx.issuedAt) : null;
    const matchFrom = !fromDate || (issued && issued >= new Date(fromDate));
    const matchTo = !toDate || (issued && issued <= new Date(toDate + "T23:59:59"));
    return matchSearch && matchFrom && matchTo;
  });

  // Group prescriptions by patient
  const groupedByPatient = filtered.reduce((acc, rx) => {
    const patientId = rx.patientId?._id || rx.patientId || "unknown";
    const patientName = rx.patientId?.name || rx.patientName || "Unknown Patient";
    const patientData = rx.patientId || { _id: patientId, name: patientName };

    if (!acc[patientId]) {
      acc[patientId] = {
        patient: { _id: patientId, name: patientName, ...patientData },
        prescriptions: []
      };
    }
    acc[patientId].prescriptions.push(rx);
    return acc;
  }, {});

  // Sort prescriptions within each patient group by date (newest first)
  Object.values(groupedByPatient).forEach(group => {
    group.prescriptions.sort((a, b) => new Date(b.issuedAt) - new Date(a.issuedAt));
  });

  const patientGroups = Object.values(groupedByPatient);
  const paginatedGroups = patientGroups.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); };

  const handleViewPatientPrescriptions = (patient, prescriptions) => {
    setSelectedPatient(patient);
    setSelectedPatientPrescriptions(prescriptions);
  };

  const handleNewPrescription = (patient) => {
    setSelectedPatientForRx(patient);
    setShowNewPrescriptionModal(true);
  };

  const handlePrescriptionCreated = async () => {
    await fetchPrescriptions();
  };

  return (
    <>
      <NewPrescriptionModal
        open={showNewPrescriptionModal}
        patient={selectedPatientForRx}
        onClose={() => {
          setShowNewPrescriptionModal(false);
          setSelectedPatientForRx(null);
        }}
        onSuccess={handlePrescriptionCreated}
      />

      <PatientPrescriptionsModal
        open={!!selectedPatient}
        patient={selectedPatient}
        prescriptions={selectedPatientPrescriptions}
        onClose={() => setSelectedPatient(null)}
        onNewPrescription={handleNewPrescription}
      />

      <div className="max-w-6xl mx-auto space-y-5">
        {/* Header with view toggle */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Prescriptions</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {loading ? "Loading…" : `${patientGroups.length} patient${patientGroups.length !== 1 ? "s" : ""} with prescriptions`}
              {viewMode === "list" && ` (${filtered.length} total prescriptions)`}
            </p>
          </div>

          {/* View mode toggle */}
          <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => { setViewMode("grouped"); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${viewMode === "grouped"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"}`}
            >
              👥 Group by Patient
            </button>
            <button
              onClick={() => { setViewMode("list"); setPage(1); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all
                ${viewMode === "list"
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-500 hover:text-gray-700"}`}
            >
              📋 List View
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search by patient, medication, or diagnosis…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">FROM</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="pl-14 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400">TO</span>
            <input type="date" value={toDate} onChange={(e) => { setToDate(e.target.value); setPage(1); }}
              className="pl-10 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          {(search || fromDate || toDate) && (
            <button onClick={clearFilters} className="px-3 py-2.5 rounded-xl border border-gray-200 text-xs font-semibold text-gray-500 hover:bg-gray-50 transition-colors">Clear ✕</button>
          )}
        </div>

        {/* Content - Grouped View */}
        {viewMode === "grouped" && (
          <>
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gray-200" />
                      <div className="flex-1">
                        <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                        <div className="h-3 bg-gray-200 rounded w-1/2" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-3 bg-gray-200 rounded w-full" />
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : paginatedGroups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-gray-100">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-3">📋</div>
                <p className="text-sm font-semibold text-gray-700">No prescriptions found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {paginatedGroups.map((group) => (
                  <PatientGroupCard
                    key={group.patient._id}
                    patient={group.patient}
                    prescriptions={group.prescriptions}
                    onViewAll={handleViewPatientPrescriptions}
                    onNewPrescription={handleNewPrescription}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* Content - List View (original table view) */}
        {viewMode === "list" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-12 gap-2 px-5 py-3 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <div className="col-span-2">Date</div>
              <div className="col-span-3">Patient</div>
              <div className="col-span-3">Diagnosis</div>
              <div className="col-span-3 hidden md:block">First Medication</div>
              <div className="col-span-1 text-right">Actions</div>
            </div>

            {/* Rows */}
            {loading ? (
              <div className="divide-y divide-gray-100">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 px-5 py-3.5 animate-pulse">
                    <div className="col-span-2 h-3 bg-gray-100 rounded" />
                    <div className="col-span-3 h-3 bg-gray-100 rounded" />
                    <div className="col-span-3 h-3 bg-gray-100 rounded" />
                    <div className="col-span-3 h-3 bg-gray-100 rounded hidden md:block" />
                    <div className="col-span-1 h-6 bg-gray-100 rounded-lg" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <div className="w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-3">📋</div>
                <p className="text-sm font-semibold text-gray-700">No prescriptions found</p>
                <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map((rx) => {
                  const patientName = rx.patientId?.name || rx.patientName || "Unknown Patient";
                  const firstMed = rx.medications?.[0];
                  return (
                    <div key={rx._id}
                      className="grid grid-cols-12 gap-2 items-center px-5 py-3.5 hover:bg-blue-50/30 transition-colors group">
                      {/* Date */}
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-gray-700">{fmtDate(rx.issuedAt)}</p>
                      </div>
                      {/* Patient */}
                      <div className="col-span-3 flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-[10px] font-bold shrink-0">
                          {getInitials(patientName)}
                        </div>
                        <p className="text-xs font-semibold text-gray-800 truncate">{patientName}</p>
                      </div>
                      {/* Diagnosis */}
                      <div className="col-span-3">
                        <p className="text-xs text-gray-700 truncate" title={rx.diagnosis}>{rx.diagnosis}</p>
                        {rx.followUpDate && (
                          <p className="text-[10px] text-amber-600 mt-0.5">↩ {fmtDate(rx.followUpDate)}</p>
                        )}
                      </div>
                      {/* First medication */}
                      <div className="col-span-3 hidden md:block">
                        {firstMed ? (
                          <div>
                            <p className="text-xs font-medium text-gray-800 truncate">{firstMed.name}</p>
                            <p className="text-[10px] text-gray-400">{[firstMed.dosage, firstMed.frequency].filter(Boolean).join(" · ")}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-gray-300 italic">None</p>
                        )}
                      </div>
                      {/* Actions */}
                      <div className="col-span-1 flex justify-end gap-1">
                        <button
                          onClick={() => handleViewPatientPrescriptions(
                            { _id: rx.patientId?._id || rx.patientId, name: patientName },
                            [rx]
                          )}
                          className="px-3 py-1.5 rounded-xl border border-gray-200 text-gray-600 text-xs font-bold
                            hover:bg-blue-50 hover:border-blue-300 hover:text-blue-600 transition-all"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <Pagination
          page={page}
          total={viewMode === "grouped" ? patientGroups.length : filtered.length}
          pageSize={PAGE_SIZE}
          onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        />
      </div>

      <style>{`@keyframes scaleIn { from { opacity:0; transform:scale(0.96); } to { opacity:1; transform:scale(1); } }`}</style>
    </>
  );
}