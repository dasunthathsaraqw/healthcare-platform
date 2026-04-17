"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import axios from "axios";
import ChatPanel from "@/components/telemedicine/ChatPanel";

const VideoConsultation = dynamic(
  () => import("@/components/telemedicine/VideoConsultation"),
  { ssr: false, loading: () => <div className="h-full w-full animate-pulse bg-slate-800" /> }
);

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";
const DOCTOR_API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

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

const BLANK_MED = { name: "", dosage: "", frequency: "", duration: "", instructions: "" };

// ─────────────────────────────────────────────────────────────────────────────
// MEDICATION ROW
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
// SUCCESS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function SuccessModal({ open, onClose, onDashboard, patientName }) {
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-8 text-center animate-[scaleIn_0.22s_ease-out]">
        <div className="w-18 h-18 inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-100 mb-5">
          <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">Prescription Issued!</h2>
        <p className="text-sm text-gray-500 mb-1">
          Prescription for <strong className="text-gray-700">{patientName || "the patient"}</strong> has been saved successfully.
        </p>
        <p className="text-xs text-gray-400 mb-7">The consultation has been marked as completed.</p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => {/* email send */ }}
            className="w-full py-2.5 rounded-xl border border-blue-200 text-sm font-semibold text-blue-600
              hover:bg-blue-50 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            Send via Email
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700
              hover:bg-gray-50 transition-colors"
          >
            Back
          </button>
          <button
            onClick={onDashboard}
            className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
              transition-colors shadow-md shadow-blue-200"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// END CALL CONFIRM MODAL
// ─────────────────────────────────────────────────────────────────────────────

function EndCallModal({ open, onCancel, onEnd }) {
  if (!open || typeof window === "undefined") return null;
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl p-7 animate-[scaleIn_0.2s_ease-out]">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 mb-4">
          <svg className="w-7 h-7 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.279 3H5z" />
          </svg>
        </div>
        <h3 className="text-base font-bold text-gray-900 mb-2">End Consultation?</h3>
        <p className="text-sm text-gray-500 mb-6">
          You haven&apos;t completed this consultation yet. Please issue a prescription before ending.
          Are you sure you want to leave?
        </p>
        <div className="flex gap-3">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
            Stay
          </button>
          <button onClick={onEnd}
            className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white text-sm font-bold shadow-md shadow-red-200 transition-colors">
            End Anyway
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT INFO PANEL
// ─────────────────────────────────────────────────────────────────────────────

function PatientInfoPanel({ patient, prescriptions }) {
  const age = calcAge(patient?.dob || patient?.dateOfBirth);
  const allergies = patient?.allergies || [];
  const history = patient?.medicalHistory || patient?.conditions || [];
  const meds = patient?.currentMedications || [];
  const reports = patient?.reports || patient?.documents || [];

  return (
    <div className="space-y-4 pb-4">
      {/* Patient header */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl border border-blue-100">
        <div className="w-12 h-12 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold text-base shrink-0">
          {getInitials(patient?.name || "P")}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">{patient?.name || "Loading…"}</p>
          {age && <p className="text-xs text-gray-500">{age} years · {patient?.gender || "—"}</p>}
          <p className="text-xs text-gray-400">{patient?.phone || "—"}</p>
        </div>
      </div>

      {/* Allergies */}
      {allergies.length > 0 && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-[10px] font-bold text-red-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
            Known Allergies
          </p>
          <div className="flex flex-wrap gap-1.5">
            {allergies.map((a, i) => (
              <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-md border border-red-200">{a}</span>
            ))}
          </div>
        </div>
      )}

      {/* Medical history */}
      <div>
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Medical History</p>
        {history.length === 0
          ? <p className="text-xs text-gray-400 italic">No conditions recorded</p>
          : <ul className="space-y-1.5">
            {history.slice(0, 5).map((h, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1 shrink-0" />
                {typeof h === "string" ? h : h.condition || h.name || "—"}
              </li>
            ))}
          </ul>
        }
      </div>

      {/* Current medications */}
      {meds.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Current Medications</p>
          <ul className="space-y-1.5">
            {meds.map((m, i) => (
              <li key={i} className="text-xs text-gray-700 flex items-start gap-2">
                <span className="text-green-500 shrink-0">💊</span>
                {typeof m === "string" ? m : `${m.name} ${m.dosage || ""}`.trim()}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Reports */}
      {reports.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Uploaded Reports</p>
          <div className="space-y-1.5">
            {reports.map((r, i) => (
              <a key={i} href={r.url || r.link || "#"} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg
                  hover:border-blue-300 hover:bg-blue-50 transition-colors group">
                <svg className="w-3.5 h-3.5 text-blue-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                <span className="text-xs text-gray-700 group-hover:text-blue-600 flex-1 truncate">{r.name || r.filename || `Report ${i + 1}`}</span>
                <svg className="w-3 h-3 text-gray-300 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Past prescriptions preview */}
      {prescriptions.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">Past Prescriptions ({prescriptions.length})</p>
          <div className="space-y-1.5">
            {prescriptions.slice(0, 3).map((rx) => (
              <div key={rx._id} className="px-3 py-2 bg-white border border-gray-100 rounded-lg">
                <p className="text-xs font-semibold text-gray-800 truncate">{rx.diagnosis}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  {rx.issuedAt ? new Date(rx.issuedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                  {" · "}{(rx.medications || []).length} medication{rx.medications?.length !== 1 ? "s" : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRESCRIPTION PANEL
// ─────────────────────────────────────────────────────────────────────────────

function PrescriptionPanel({ onIssue, saving }) {
  const [rx, setRx] = useState({
    diagnosis: "",
    medications: [],
    notes: "",
    followUpDate: "",
  });
  const [errors, setErrors] = useState({});

  const addMed = () => setRx((p) => ({ ...p, medications: [...p.medications, { ...BLANK_MED }] }));
  const delMed = (i) => setRx((p) => ({ ...p, medications: p.medications.filter((_, idx) => idx !== i) }));
  const chgMed = (i, field, val) =>
    setRx((p) => ({ ...p, medications: p.medications.map((m, idx) => idx === i ? { ...m, [field]: val } : m) }));

  const handleSubmit = () => {
    const errs = {};
    if (!rx.diagnosis.trim()) errs.diagnosis = "Diagnosis is required";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    onIssue(rx);
  };

  return (
    <div className="space-y-4 pb-6">
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
          <div className="space-y-2">
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

      {/* CTA */}
      <div className="flex flex-col gap-2.5 pt-2 border-t border-gray-100">
        <button onClick={handleSubmit} disabled={saving}
          className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold
            disabled:opacity-60 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
          {saving
            ? (<><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Saving…</>)
            : (<><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>Issue Prescription</>)
          }
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ConsultationPage() {
  const { appointmentId } = useParams();
  const router = useRouter();

  const [appointment, setAppointment] = useState(null);
  const [patient, setPatient] = useState(null);
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Right panel tab (desktop)
  const [panelTab, setPanelTab] = useState("info");  // "info" | "prescription" | "chat"
  // Mobile bottom sheet
  const [mobilePanel, setMobilePanel] = useState(null);

  // Saving / completion
  const [saving, setSaving] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // End call
  const [endModal, setEndModal] = useState(false);

  // ── Fetch appointment & patient ────────────────────────────────────────────
  useEffect(() => {
    if (!appointmentId) return;

    (async () => {
      try {
        setLoading(true);

        // Single API call to get both appointment and patient data
        const response = await axios.get(
          `${DOCTOR_API_BASE}/doctors/consultation/${appointmentId}`,
          { headers: authHeaders() }
        );

        const { appointment: appt, patient: pat, prescriptions: rxList } = response.data;

        setAppointment(appt);
        setPatient(pat);
        setPrescriptions(rxList || []);

      } catch (err) {
        console.error("Fetch error:", err);
        setError(err.response?.data?.message || "Failed to load consultation data");
      } finally {
        setLoading(false);
      }
    })();
  }, [appointmentId]);

  // ── beforeunload warning ───────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (!completed) {
        e.preventDefault();
        e.returnValue = "You haven't completed this consultation. Are you sure you want to leave?";
        return e.returnValue;
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [completed]);

  // ── Issue prescription → complete appointment ──────────────────────────────
  const handleIssue = async (rxData) => {
    if (!appointment) return;
    setSaving(true);

    try {
      // Save prescription using doctor service
      await axios.post(`${DOCTOR_API_BASE}/doctors/prescriptions`, {
        patientId: appointment.patientId,  // Direct string ID
        appointmentId: appointmentId,
        diagnosis: rxData.diagnosis,
        medications: rxData.medications,
        notes: rxData.notes,
        followUpDate: rxData.followUpDate || undefined,
      }, { headers: authHeaders() });

      // Complete appointment using new consultation endpoint
      await axios.put(
        `${DOCTOR_API_BASE}/doctors/consultation/${appointmentId}/complete`,
        {},
        { headers: authHeaders() }
      );

      setCompleted(true);
      setSuccessModal(true);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save prescription");
    } finally {
      setSaving(false);
    }
  };

  const handleEndCall = () => {
    if (!completed) { setEndModal(true); return; }
    router.push("/doctor/dashboard");
  };

  const handleForceEnd = () => {
    setEndModal(false);
    router.push("/doctor/dashboard");
  };

  // ── Patient name ──────────────────────────────────────────────────────────
  const patientName = patient?.name || appointment?.patientId?.name || appointment?.patientName || "Patient";

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <>
      <SuccessModal
        open={successModal}
        onClose={() => setSuccessModal(false)}
        onDashboard={() => router.push("/doctor/dashboard")}
        patientName={patientName}
      />
      <EndCallModal
        open={endModal}
        onCancel={() => setEndModal(false)}
        onEnd={handleForceEnd}
      />

      {/* Full-screen overlay over the doctor layout */}
      <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col lg:flex-row overflow-hidden">

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <svg className="animate-spin w-10 h-10 text-blue-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <p className="text-slate-400 text-sm">Loading consultation…</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-4">
              <p className="text-red-400 font-semibold mb-2">{error}</p>
              <button onClick={() => router.push("/doctor/appointments")}
                className="text-sm text-slate-400 hover:text-white underline">← Back to Appointments</button>
            </div>
          </div>
        ) : (
          <>
            {/* ── LEFT: Agora video (same channel as patient dashboard) ── */}
            <div className="relative flex min-h-0 flex-1 flex-col lg:h-full lg:w-[70%] h-[55vh]">
              <VideoConsultation
                appointmentId={appointmentId}
                userRole="doctor"
                doctorName={patientName}
                peerDisplayName={patientName}
                compact
                apiBase={API_BASE}
                onLeave={handleEndCall}
              />
            </div>

            {/* ── RIGHT: Info / Prescription Panel (30%) ────────────────── */}
            <div className="flex flex-col lg:w-[30%] bg-white border-l border-slate-700/30 overflow-hidden">
              {/* Panel header with tabs */}
              <div className="flex border-b border-gray-100 shrink-0 bg-white">
                {[
                  { id: "info", label: "Patient Info", icon: "👤" },
                  { id: "prescription", label: "Rx", icon: "💊" },
                  { id: "chat", label: "Chat", icon: "💬" },
                ].map((t) => (
                  <button key={t.id} onClick={() => setPanelTab(t.id)}
                    className={`flex-1 px-2 py-3 text-[11px] font-bold uppercase tracking-wide border-b-2 transition-colors flex flex-col items-center gap-0.5
                      ${panelTab === t.id
                        ? "border-blue-600 text-blue-600 bg-blue-50/30"
                        : "border-transparent text-gray-400 hover:text-gray-600"}`}>
                    <span>{t.icon}</span>
                    <span>{t.label}</span>
                  </button>
                ))}
              </div>

              {/* Completion badge */}
              {completed && (
                <div className="flex items-center gap-2 px-4 py-2.5 bg-green-50 border-b border-green-100 shrink-0">
                  <svg className="w-4 h-4 text-green-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  <p className="text-xs text-green-700 font-semibold">Consultation completed ✓</p>
                </div>
              )}

              {/* Scrollable content */}
              <div className={`flex-1 min-h-0 ${panelTab === "chat" ? "flex flex-col overflow-hidden" : "overflow-y-auto px-4 pt-4"}`}>
                {panelTab === "info" && (
                  <PatientInfoPanel patient={patient || {}} prescriptions={prescriptions} />
                )}
                {panelTab === "prescription" && (
                  completed
                    ? <div className="flex flex-col items-center justify-center h-48 text-center">
                      <svg className="w-10 h-10 text-green-400 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      <p className="text-sm font-semibold text-gray-700">Prescription issued</p>
                      <p className="text-xs text-gray-400 mt-1">This consultation is complete</p>
                    </div>
                    : <PrescriptionPanel onIssue={handleIssue} saving={saving} />
                )}
                {panelTab === "chat" && (
                  <ChatPanel
                    appointmentId={appointmentId}
                    otherPartyName={patientName}
                    className="flex-1 h-full"
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to   { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </>
  );
}
