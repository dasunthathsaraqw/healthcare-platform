"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
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
// PATIENT DETAILS MODAL
// ─────────────────────────────────────────────────────────────────────────────

function PatientModal({ open, onClose, patientId }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab, setTab]         = useState("info");
  const [err, setErr]         = useState("");

  useEffect(() => {
    if (!open || !patientId) return;
    setData(null); setErr(""); setTab("info"); setLoading(true);
    axios.get(`${API_BASE}/doctors/patients/${patientId}`, { headers: authHeaders() })
      .then(({ data: res }) => setData(res))
      .catch((e) => setErr(e.response?.data?.message || "Failed to load patient"))
      .finally(() => setLoading(false));
  }, [open, patientId]);

  if (!open || typeof window === "undefined") return null;

  const patient      = data?.patient || {};
  const prescriptions = data?.prescriptions || [];
  const allergies    = patient.allergies || [];
  const history      = patient.medicalHistory || patient.conditions || [];
  const reports      = patient.reports || patient.documents || [];
  const age          = calcAge(patient.dob || patient.dateOfBirth);

  const TABS = [
    { id: "info",    label: "Info" },
    { id: "history", label: "History" },
    { id: "scripts", label: `Rx (${prescriptions.length})` },
    { id: "reports", label: "Reports" },
  ];

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[88vh] animate-[scaleIn_.2s_ease-out]">
        {/* Header */}
        <div className={`flex items-center gap-3 px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-cyan-50 shrink-0`}>
          <div className={`w-11 h-11 rounded-full bg-gradient-to-br ${avatarColor(patient.name)} flex items-center justify-center text-white font-bold shrink-0`}>
            {getInitials(patient.name || "P")}
          </div>
          <div className="min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{patient.name || "Patient"}</p>
            <p className="text-xs text-gray-500">{patient.email || ""}</p>
          </div>
          <button onClick={onClose} className="ml-auto p-1.5 rounded-lg hover:bg-gray-200 text-gray-400 hover:text-gray-600 shrink-0">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
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
          {loading && <div className="space-y-3 animate-pulse">{[1,2,3].map((i) => <div key={i} className="h-8 bg-gray-100 rounded-xl" />)}</div>}
          {err && <p className="text-sm text-red-500 text-center py-10">{err}</p>}
          {!loading && !err && (
            <>
              {tab === "info" && (
                <dl className="space-y-0 divide-y divide-gray-100">
                  {[
                    ["Full Name",    patient.name],
                    ["Email",        patient.email],
                    ["Phone",        patient.phone],
                    ["Age",          age ? `${age} years` : null],
                    ["Gender",       patient.gender],
                    ["Blood Group",  patient.bloodGroup || patient.bloodType],
                    ["Address",      patient.address],
                  ].map(([label, val]) => val ? (
                    <div key={label} className="flex gap-3 py-2.5">
                      <dt className="text-xs font-semibold text-gray-400 uppercase tracking-wide w-28 shrink-0">{label}</dt>
                      <dd className="text-sm text-gray-800">{val}</dd>
                    </div>
                  ) : null)}
                </dl>
              )}

              {tab === "history" && (
                <div className="space-y-3">
                  {history.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">No medical history recorded</p>
                    : history.map((h, i) => (
                      <div key={i} className="flex items-start gap-2.5 px-4 py-3 bg-blue-50 border border-blue-100 rounded-xl text-sm text-gray-800">
                        <span className="text-blue-400 shrink-0">•</span>
                        {typeof h === "string" ? h : h.condition || h.name || JSON.stringify(h)}
                      </div>
                    ))
                  }
                  {allergies.length > 0 && (
                    <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                      <p className="text-[10px] font-bold text-red-500 uppercase mb-2">⚠ Allergies</p>
                      <div className="flex flex-wrap gap-1.5">
                        {allergies.map((a, i) => <span key={i} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded-md">{a}</span>)}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === "scripts" && (
                <div className="space-y-3">
                  {prescriptions.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">No prescriptions issued yet</p>
                    : prescriptions.map((rx) => (
                      <div key={rx._id} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="flex items-start justify-between px-4 py-3 bg-gray-50 border-b border-gray-100">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{rx.diagnosis}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{fmtDate(rx.issuedAt)}</p>
                          </div>
                          {rx.followUpDate && (
                            <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded-lg whitespace-nowrap">
                              Follow-up: {fmtDate(rx.followUpDate)}
                            </span>
                          )}
                        </div>
                        <ul className="divide-y divide-gray-100">
                          {(rx.medications || []).map((m, i) => (
                            <li key={i} className="px-4 py-2.5 flex items-start gap-2.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-gray-800">{m.name}</p>
                                <p className="text-xs text-gray-400">{[m.dosage, m.frequency, m.duration].filter(Boolean).join(" · ")}</p>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))
                  }
                </div>
              )}

              {tab === "reports" && (
                <div>
                  {reports.length === 0
                    ? <p className="text-sm text-gray-400 text-center py-8">No reports uploaded</p>
                    : <ul className="space-y-2">
                        {reports.map((r, i) => (
                          <li key={i} className="flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-blue-200 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                                <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                              </div>
                              <p className="text-sm font-medium text-gray-800">{r.name || r.filename || `Report ${i + 1}`}</p>
                            </div>
                            <a href={r.url || "#"} target="_blank" rel="noreferrer"
                              className="text-xs text-blue-600 font-semibold hover:underline px-3 py-1.5 rounded-lg hover:bg-blue-50">View ↗</a>
                          </li>
                        ))}
                      </ul>
                  }
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
  const pid  = patient._id;
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
          <p className="text-lg font-bold text-blue-600">{patient.totalVisits ?? "—"}</p>
          <p className="text-[10px] text-blue-400 font-medium">Total Visits</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-3 py-2 text-center">
          <p className="text-xs font-bold text-gray-700">{fmtDate(patient.lastVisit)}</p>
          <p className="text-[10px] text-gray-400 font-medium mt-0.5">Last Visit</p>
        </div>
      </div>

      <button onClick={() => onView(pid)}
        className="w-full py-2 rounded-xl border border-blue-200 text-blue-600 text-xs font-bold
          hover:bg-blue-50 transition-colors flex items-center justify-center gap-1.5">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
        View Profile
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PATIENT ROW (list)
// ─────────────────────────────────────────────────────────────────────────────

function PatientRow({ patient, onView }) {
  const name = patient.name || "Unknown";
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
        <p className="text-sm font-bold text-blue-600">{patient.totalVisits ?? "—"}</p>
        <p className="text-[10px] text-gray-400">Visits</p>
      </div>
      <div className="text-right hidden md:block w-32">
        <p className="text-xs font-medium text-gray-700">{fmtDate(patient.lastVisit)}</p>
        <p className="text-[10px] text-gray-400">Last visit</p>
      </div>
      <button onClick={() => onView(patient._id)}
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
  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button onClick={() => onChange(page - 1)} disabled={page === 1}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs">
        ‹
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-8 h-8 rounded-lg text-xs font-semibold transition-colors
            ${p === page ? "bg-blue-600 text-white shadow-sm" : "border border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(page + 1)} disabled={page === totalPages}
        className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500
          hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs">
        ›
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function PatientsPage() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate]     = useState("");
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
  const [page, setPage]         = useState(1);
  const [patientId, setPatientId] = useState(null);
  const debounceRef             = useRef(null);

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

  // Client-side filter: search + date range
  const filtered = patients.filter((p) => {
    const name = (p.name || "").toLowerCase();
    const matchSearch = !search || name.includes(search.toLowerCase());
    const last = p.lastVisit ? new Date(p.lastVisit) : null;
    const matchFrom = !fromDate || (last && last >= new Date(fromDate));
    const matchTo   = !toDate   || (last && last <= new Date(toDate + "T23:59:59"));
    return matchSearch && matchFrom && matchTo;
  });

  // Pagination slice
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setPage(1), 300);
  };

  const clearFilters = () => { setSearch(""); setFromDate(""); setToDate(""); setPage(1); };

  const Skeleton = () => (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4 animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2"><div className="h-3.5 w-32 bg-gray-200 rounded" /><div className="h-2.5 w-48 bg-gray-100 rounded" /></div>
      </div>
      <div className="grid grid-cols-2 gap-2"><div className="h-14 bg-gray-100 rounded-xl" /><div className="h-14 bg-gray-100 rounded-xl" /></div>
      <div className="h-8 bg-gray-100 rounded-xl" />
    </div>
  );

  return (
    <>
      <PatientModal open={!!patientId} patientId={patientId} onClose={() => setPatientId(null)} />

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
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input type="text" value={search} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search by patient name…"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-800 placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          {/* From */}
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-400 pointer-events-none">FROM</span>
            <input type="date" value={fromDate} onChange={(e) => { setFromDate(e.target.value); setPage(1); }}
              className="pl-14 pr-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-700
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition" />
          </div>
          {/* To */}
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
              viewMode === "grid" ? <Skeleton key={i} /> :
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
            {paginated.map((p) => <PatientCard key={p._id} patient={p} onView={setPatientId} />)}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-4 px-4 py-2.5 bg-gray-50 border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wide">
              <div className="col-span-2">Patient</div>
              <div className="hidden sm:block text-center">Visits</div>
              <div className="hidden md:block text-right">Last Visit</div>
            </div>
            {paginated.map((p) => <PatientRow key={p._id} patient={p} onView={setPatientId} />)}
          </div>
        )}

        <Pagination page={page} total={filtered.length} pageSize={PAGE_SIZE} onChange={(p) => { setPage(p); window.scrollTo({ top: 0, behavior: "smooth" }); }} />
      </div>

      <style>{`
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
}
