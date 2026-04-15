"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import axios from "axios";

const TELEMEDICINE_API_BASE =
  process.env.NEXT_PUBLIC_TELEMEDICINE_API_URL || "http://localhost:5004/api";

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("token") || "";
}

export default function TelemedicineHubCard({
  title,
  subtitle,
  allowManualEntry = true,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [appointmentId, setAppointmentId] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasAutoOpenedRef = useRef(false);

  const token = useMemo(() => getToken(), []);

  const apiClient = useMemo(() => {
    return axios.create({
      baseURL: TELEMEDICINE_API_BASE,
      headers: {
        "Content-Type": "application/json",
        Authorization: token ? `Bearer ${token}` : "",
      },
      timeout: 20000,
    });
  }, [token]);

  const openConsultation = (id) => {
    const cleanId = String(id || "").trim();
    if (!cleanId) {
      return;
    }
    router.push(`/telemedicine/consultation/${encodeURIComponent(cleanId)}`);
  };

  useEffect(() => {
    const selectedAppointmentId = (searchParams.get("appointmentId") || "").trim();
    if (!selectedAppointmentId || hasAutoOpenedRef.current) {
      return;
    }

    hasAutoOpenedRef.current = true;
    setAppointmentId(selectedAppointmentId);
    openConsultation(selectedAppointmentId);
  }, [searchParams]);

  const loadMySessions = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await apiClient.get("/telemedicine/my-sessions");
      setSessions(response?.data?.data || []);
    } catch (requestError) {
      setError(
        requestError?.response?.data?.message || "Unable to load your telemedicine sessions."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm sm:p-6">
      <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>

      {allowManualEntry && (
        <div className="mt-5 rounded-xl border border-blue-100 bg-slate-50 p-4">
          <label htmlFor="appointment-id" className="block text-sm font-medium text-slate-700">
            Enter Appointment ID
          </label>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              id="appointment-id"
              type="text"
              value={appointmentId}
              onChange={(event) => setAppointmentId(event.target.value)}
              placeholder="e.g. APT-2026-0012"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-blue-200 transition focus:border-blue-400 focus:ring"
            />
            <button
              type="button"
              onClick={() => openConsultation(appointmentId)}
              className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open Consultation
            </button>
          </div>
        </div>
      )}

      <div className="mt-4">
        <button
          type="button"
          onClick={loadMySessions}
          disabled={loading}
          className="rounded-xl border border-blue-200 bg-white px-4 py-2 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Loading Sessions..." : "Load My Sessions"}
        </button>
      </div>

      {error && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="mt-5 space-y-3">
        {sessions.map((session) => (
          <button
            key={session._id}
            type="button"
            onClick={() => openConsultation(session.appointmentId)}
            className="w-full rounded-xl border border-slate-200 p-3 text-left transition hover:border-blue-300 hover:bg-blue-50"
          >
            <p className="text-sm font-semibold text-slate-900">
              Appointment: {session.appointmentId}
            </p>
            <p className="mt-1 text-xs text-slate-600">
              Status: {session.status} · Scheduled:{" "}
              {session.scheduledAt ? new Date(session.scheduledAt).toLocaleString() : "-"}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
