"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import axios from "axios";
import ConsultationInfoCard from "@/components/telemedicine/ConsultationInfoCard";
import JitsiMeetingCard from "@/components/telemedicine/JitsiMeetingCard";
import {
  ErrorState,
  LoadingState,
} from "@/components/telemedicine/ConsultationStates";

const TELEMEDICINE_API_BASE =
  process.env.NEXT_PUBLIC_TELEMEDICINE_API_URL || "http://localhost:5004/api";

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }
  return localStorage.getItem("token") || "";
}

function parseStoredUser() {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch (_error) {
    return null;
  }
}

export default function TelemedicineConsultationPage() {
  const { appointmentId } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [hasJoined, setHasJoined] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  const token = useMemo(() => getToken(), []);
  const currentUser = useMemo(() => parseStoredUser(), []);

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

  const fetchSession = useCallback(async () => {
    if (!appointmentId) {
      setError("Missing appointment ID in the route.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await apiClient.get(`/telemedicine/sessions/${appointmentId}`);
      setSession(response?.data?.data || null);
    } catch (requestError) {
      const status = requestError?.response?.status;

      if (status === 401 || status === 403) {
        setError("Unauthorized access to this consultation session.");
        return;
      }

      if (status === 404) {
        setError("Session not found for this appointment.");
        return;
      }

      setError(
        requestError?.response?.data?.message ||
          "Unable to fetch telemedicine consultation details."
      );
    } finally {
      setLoading(false);
    }
  }, [apiClient, appointmentId]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const handleJoin = async () => {
    if (!session?.appointmentId) {
      return;
    }

    try {
      const response = await apiClient.patch(
        `/telemedicine/sessions/${session.appointmentId}/start`
      );
      setSession(response?.data?.data || session);
      setHasJoined(true);
    } catch (requestError) {
      if (requestError?.response?.status === 403) {
        setError("You are not allowed to join this consultation.");
      } else {
        setError(
          requestError?.response?.data?.message || "Failed to start the consultation."
        );
      }
    }
  };

  const handleEnd = async () => {
    if (!session?.appointmentId || session?.status === "ENDED") {
      return;
    }

    try {
      setIsEnding(true);
      const response = await apiClient.patch(
        `/telemedicine/sessions/${session.appointmentId}/end`
      );
      setSession(response?.data?.data || session);
    } catch (requestError) {
      if (requestError?.response?.status === 403) {
        setError("You are not allowed to end this consultation.");
      } else {
        setError(
          requestError?.response?.data?.message || "Failed to end the consultation."
        );
      }
    } finally {
      setIsEnding(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (!token) {
    return <ErrorState message="Unauthorized. Please log in to continue." />;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!session) {
    return <ErrorState message="Session data is unavailable for this appointment." />;
  }

  const sessionWithNames = {
    ...session,
    doctorName:
      session.doctorName ||
      (currentUser?.role === "doctor" ? currentUser?.name || "" : ""),
    patientName:
      session.patientName ||
      (currentUser?.role === "patient" ? currentUser?.name || "" : ""),
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl space-y-5">
        <header className="rounded-2xl bg-gradient-to-r from-blue-700 to-blue-500 px-6 py-6 text-white shadow-sm">
          <h1 className="text-2xl font-semibold">Telemedicine Consultation</h1>
          <p className="mt-1 text-sm text-blue-100">
            Secure video visit dashboard for appointment {session.appointmentId}
          </p>
        </header>

        <section className="grid grid-cols-1 gap-5 xl:grid-cols-12">
          <div className="xl:col-span-8">
            <JitsiMeetingCard
              roomId={session.roomId}
              displayName={currentUser?.name || "Healthcare User"}
              hasJoined={hasJoined || session.status === "ACTIVE" || session.status === "ENDED"}
              onJoin={handleJoin}
              onEnd={handleEnd}
              isEnding={isEnding}
              isEnded={session.status === "ENDED"}
            />
          </div>

          <div className="xl:col-span-4">
            <ConsultationInfoCard session={sessionWithNames} />
          </div>
        </section>
      </div>
    </main>
  );
}
