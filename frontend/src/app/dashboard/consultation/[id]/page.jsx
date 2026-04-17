"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import axios from "axios";
import ChatPanel from "@/components/telemedicine/ChatPanel";

const VideoConsultation = dynamic(
  () => import("@/components/telemedicine/VideoConsultation"),
  { ssr: false, loading: () => <div className="animate-pulse bg-gray-800 w-full h-full rounded-xl" /> }
);

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function fmtDate(d) {
  if (!d) return "Not scheduled";
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

export default function PatientConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id;

  const [appointment, setAppointment] = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [user,        setUser]        = useState(null);
  const [chatOpen,    setChatOpen]    = useState(false);

  // Load user info
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setUser(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Fetch appointment details
  useEffect(() => {
    if (!consultationId) return;
    setLoading(true);
    setError("");
    axios
      .get(`${API_BASE}/appointments/${consultationId}`, { headers: authHeaders() })
      .then((res) => {
        const data = res.data?.appointment || res.data;
        setAppointment(data);
      })
      .catch((err) => {
        console.error("Failed to fetch appointment:", err);
        setError("Unable to load appointment details.");
      })
      .finally(() => setLoading(false));
  }, [consultationId]);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Joining consultation…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (error || !appointment) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center z-50">
        <div className="text-center max-w-sm px-6">
          <div className="w-14 h-14 rounded-full bg-red-900/50 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-red-400 text-sm mb-5">{error || "Appointment not found"}</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-5 py-2.5 bg-white text-slate-900 text-sm font-semibold rounded-xl hover:bg-gray-100 transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const doctorName = appointment.doctorName || "Doctor";

  // ── Full-screen consultation UI ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col overflow-hidden">

      {/* ── Top bar ─────────────────────────────────────────────────────── */}
      <div className="shrink-0 bg-slate-800 border-b border-slate-700 px-4 py-3 flex items-center justify-between">
        {/* Doctor info */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-white text-sm font-bold shrink-0">
            {getInitials(doctorName)}
          </div>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Dr. {doctorName}</p>
            <p className="text-slate-400 text-[11px]">{appointment.specialty || "Specialist"}</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 ml-2 px-2 py-0.5 bg-green-600/20 border border-green-500/30 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            <span className="text-green-400 text-[10px] font-semibold">Confirmed</span>
          </div>
        </div>

        {/* Right: schedule info + actions */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right">
            <p className="text-slate-300 text-xs font-semibold">{fmtDate(appointment.dateTime)}</p>
            <p className="text-blue-400 text-[11px] font-bold">{fmtTime(appointment.dateTime)}</p>
          </div>

          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
              chatOpen
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/30"
                : "bg-slate-700 text-slate-300 hover:bg-slate-600"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            <span className="hidden sm:inline">Chat</span>
          </button>

          {/* Leave button */}
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span className="hidden sm:inline">Leave</span>
          </button>
        </div>
      </div>

      {/* ── Main area: video + optional chat ────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden min-h-0">

        {/* Video consultation (Agora) */}
        <div className="flex-1 min-w-0">
          <VideoConsultation
            appointmentId={consultationId}
            userRole="patient"
            doctorName={doctorName}
            onLeave={() => router.push("/dashboard")}
          />
        </div>

        {/* Chat side panel */}
        {chatOpen && (
          <div className="w-72 sm:w-80 shrink-0 flex flex-col border-l border-slate-700">
            <ChatPanel
              appointmentId={consultationId}
              otherPartyName={`Dr. ${doctorName}`}
              className="flex-1 h-full"
            />
          </div>
        )}

      </div>
    </div>
  );
}
