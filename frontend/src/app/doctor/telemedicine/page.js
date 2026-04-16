"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import ChatPanel from "@/components/telemedicine/ChatPanel";

const API_BASE = (process.env.NEXT_PUBLIC_DOCTOR_API_URL || process.env.NEXT_PUBLIC_API_URL) || "http://localhost:8080/api";

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
  return name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "P";
}

function isWithinWindow(rawDate, windowMins = 30) {
  if (!rawDate) return false;
  const diff = (new Date(rawDate).getTime() - Date.now()) / 60000;
  return diff >= -windowMins && diff <= windowMins;
}

const STATUS_STYLES = {
  pending: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400", label: "Pending" },
  confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Confirmed" },
  completed: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500", label: "Completed" },
  cancelled: { bg: "bg-gray-100", text: "text-gray-500", dot: "bg-gray-400", label: "Cancelled" },
  rejected: { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-400", label: "Rejected" },
};

export default function DoctorTelemedicinePage() {
  const router = useRouter();

  const [upcoming, setUpcoming] = useState([]);
  const [past, setPast] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [chatAppt, setChatAppt] = useState(null);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await axios.get(`${API_BASE}/doctors/appointments`, {
        headers: authHeaders(),
      });
      const all = data.appointments || data || [];

      // Upcoming = confirmed/pending with a meetingLink
      const now = Date.now();
      setUpcoming(
        all.filter(a =>
          a.meetingLink &&
          ["confirmed", "pending"].includes(a.status) &&
          new Date(a.dateTime).getTime() >= now - 60 * 60 * 1000 // within last hour
        )
      );
      // Past = completed with meetingLink
      setPast(all.filter(a => a.meetingLink && a.status === "completed"));
    } catch (err) {
      setError(err.response?.data?.message || "Unable to load telemedicine sessions.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  const openChat = (appt) => setChatAppt(prev => prev?._id === appt._id ? null : appt);
  const startCall = (id) => router.push(`/doctor/consultation/${id}`);

  return (
    <div className="min-h-screen">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Telemedicine Hub
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage video sessions and chat with patients.</p>
        </div>
        <button
          onClick={fetchAppointments}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 text-sm font-semibold text-gray-600 hover:text-blue-600 transition-all disabled:opacity-50"
        >
          <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 flex items-center gap-2">
          <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}

      {/* ── Main layout ─────────────────────────────────────────────────── */}
      <div className="flex gap-6 items-start">

        {/* Left: cards */}
        <div className={`flex-1 min-w-0 grid grid-cols-1 ${chatAppt ? "" : "lg:grid-cols-2"} gap-6`}>

          {/* ── Upcoming Sessions ──────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "420px" }}>
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl -mr-10 -mt-10" />
              <h2 className="text-white font-bold text-lg flex items-center gap-2 relative z-10">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                Upcoming Sessions
              </h2>
              <p className="text-blue-100 text-xs mt-1 relative z-10">Start consultation or chat with patients</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 max-h-[420px]">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                </div>
              ) : upcoming.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center opacity-60">
                  <span className="text-4xl mb-3">📭</span>
                  <p className="text-sm font-bold text-gray-700">No upcoming video sessions</p>
                  <p className="text-xs text-gray-400 mt-1">Confirmed appointments with video links will appear here.</p>
                </div>
              ) : (
                upcoming.map((appt) => {
                  const inWindow = isWithinWindow(appt.dateTime);
                  const patientName = appt.patientName || appt.patientId?.name || "Patient";
                  const st = STATUS_STYLES[appt.status] || STATUS_STYLES.confirmed;
                  return (
                    <div
                      key={appt._id}
                      className={`bg-white p-4 rounded-xl border shadow-sm hover:shadow-md transition-all relative overflow-hidden group ${chatAppt?._id === appt._id ? "border-blue-300 ring-2 ring-blue-100" : "border-gray-200"
                        }`}
                    >
                      {inWindow && <div className="absolute top-0 left-0 w-1 h-full bg-green-500" />}
                      {!inWindow && appt.status === "confirmed" && <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />}

                      {/* Patient info */}
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 text-white flex items-center justify-center font-black text-sm shrink-0">
                            {getInitials(patientName)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{patientName}</h3>
                            <p className="text-xs text-gray-500">{appt.reason || "General consultation"}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md ${st.bg} ${st.text}`}>
                          {st.label}
                        </span>
                      </div>

                      {/* Date strip */}
                      <div className="bg-slate-50 p-2.5 rounded-lg mb-3 flex justify-between items-center border border-slate-100">
                        <p className="text-sm font-semibold text-gray-800">{fmtDate(appt.dateTime)}</p>
                        <p className={`text-sm font-black ${inWindow ? "text-green-600" : "text-blue-600"}`}>
                          {fmtTime(appt.dateTime)}
                          {inWindow && <span className="ml-1 text-[10px] bg-green-100 text-green-700 px-1 rounded font-bold">NOW</span>}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => startCall(appt._id)}
                          className={`flex-1 py-2.5 text-white text-sm font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${inWindow
                              ? "bg-green-500 hover:bg-green-600 shadow-md shadow-green-100 animate-pulse"
                              : "bg-blue-600 hover:bg-blue-700 shadow-sm shadow-blue-100"
                            }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          {inWindow ? "Start Now" : "Start Consultation"}
                        </button>

                        <button
                          onClick={() => openChat(appt)}
                          className={`px-3 py-2.5 rounded-lg border text-sm font-bold transition-all flex items-center gap-1.5 ${chatAppt?._id === appt._id
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-md"
                              : "bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {chatAppt?._id === appt._id ? "Close" : "Chat"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Completed Sessions ─────────────────────────────────────── */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ minHeight: "420px" }}>
            <div className="bg-slate-800 p-5 shrink-0 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10" />
              <h2 className="text-white font-bold text-lg flex items-center gap-2 relative z-10">
                <svg className="w-5 h-5 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Completed Sessions
              </h2>
              <p className="text-slate-300 text-xs mt-1 relative z-10">Review chat history and past consultations</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30 max-h-[420px]">
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                </div>
              ) : past.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-center opacity-60">
                  <span className="text-4xl mb-3">📂</span>
                  <p className="text-sm font-bold text-gray-700">No completed sessions</p>
                  <p className="text-xs text-gray-400 mt-1">Finished consultations will appear here.</p>
                </div>
              ) : (
                past.map((appt) => {
                  const patientName = appt.patientName || appt.patientId?.name || "Patient";
                  return (
                    <div key={appt._id} className={`bg-white p-4 rounded-xl border shadow-sm transition-all ${chatAppt?._id === appt._id ? "border-indigo-300 ring-2 ring-indigo-100" : "border-gray-200"
                      }`}>
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex gap-2 items-center">
                          <div className="w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-black text-xs">
                            {getInitials(patientName)}
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-gray-900">{patientName}</h3>
                            <p className="text-[10px] text-gray-400">{fmtDate(appt.dateTime)} · {fmtTime(appt.dateTime)}</p>
                          </div>
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-bold px-2 py-0.5 rounded-md bg-green-50 text-green-700">
                          Completed
                        </span>
                      </div>

                      <div className="text-xs text-gray-600 line-clamp-2 mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        {appt.reason || "No reason noted."}
                      </div>

                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={() => startCall(appt._id)}
                          className="flex-1 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition flex justify-center items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          View Notes
                        </button>
                        <button
                          onClick={() => openChat(appt)}
                          className={`px-3 py-1.5 rounded-lg border text-xs font-semibold transition flex items-center gap-1.5 ${chatAppt?._id === appt._id
                              ? "bg-indigo-600 text-white border-indigo-600"
                              : "bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
                            }`}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                          </svg>
                          {chatAppt?._id === appt._id ? "Close" : "Chat History"}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* ── Chat Panel ────────────────────────────────────────────────── */}
        {chatAppt && (
          <div className="w-80 shrink-0 sticky top-4">
            <div className="rounded-2xl overflow-hidden shadow-xl border border-gray-200 flex flex-col" style={{ height: "560px" }}>
              <ChatPanel
                key={chatAppt._id}
                appointmentId={chatAppt._id}
                otherPartyName={chatAppt.patientName || chatAppt.patientId?.name || "Patient"}
                className="flex-1 h-full"
              />
            </div>
            <button
              onClick={() => setChatAppt(null)}
              className="mt-2 w-full py-1.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs font-semibold transition flex items-center justify-center gap-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Close Chat
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
