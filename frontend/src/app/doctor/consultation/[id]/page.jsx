"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import axios from "axios";
import VideoConsultation from "../../../../components/telemedicine/VideoConsultation";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function getInitials(name = "") {
  return name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
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

export default function DoctorConsultationPage() {
  const params = useParams();
  const router = useRouter();
  const consultationId = params.id;

  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [doctor, setDoctor] = useState(null);

  // Load doctor info
  useEffect(() => {
    try {
      const stored = localStorage.getItem("user");
      if (stored) setDoctor(JSON.parse(stored));
    } catch (_) {}
  }, []);

  // Fetch appointment details
  useEffect(() => {
    const fetchAppointment = async () => {
      if (!consultationId) return;
      
      setLoading(true);
      setError("");
      
      try {
        const response = await axios.get(
          `${API_BASE}/appointments/${consultationId}`,
          { headers: authHeaders() }
        );
        setAppointment(response.data);
      } catch (err) {
        console.error("Failed to fetch appointment:", err);
        setError("Unable to load appointment details. Please refresh the page.");
      } finally {
        setLoading(false);
      }
    };

    fetchAppointment();
  }, [consultationId]);

  const handleLeaveConsultation = () => {
    router.push("/doctor/appointments");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 animate-pulse mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Loading consultation...</p>
        </div>
      </div>
    );
  }

  if (error || !appointment) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-100 mx-auto mb-4 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-sm text-red-600 mb-4">{error || "Appointment not found"}</p>
          <button
            onClick={() => router.push("/doctor/appointments")}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/doctor/appointments")}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Video Consultation</h1>
              <p className="text-sm text-gray-500">Appointment ID: {appointment._id?.slice(-8) || consultationId.slice(-8)}</p>
            </div>
          </div>
          <button
            onClick={handleLeaveConsultation}
            className="px-4 py-2 bg-red-50 text-red-600 text-sm font-medium rounded-lg hover:bg-red-100 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Leave Call
          </button>
        </div>
      </div>

      {/* Appointment Info Bar */}
      <div className="bg-blue-50 border-b border-blue-100 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
                {appointment.patientProfilePicture ? (
                  <img src={appointment.patientProfilePicture} alt={appointment.patientName} className="w-full h-full rounded-full object-cover" />
                ) : (
                  getInitials(appointment.patientName)
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{appointment.patientName || "Patient"}</p>
                <p className="text-xs text-gray-500">Patient</p>
              </div>
            </div>
            
            <div className="h-8 w-px bg-blue-200" />
            
            <div>
              <p className="text-xs text-gray-500">Scheduled Time</p>
              <p className="text-sm font-semibold text-gray-900">
                {fmtDate(appointment.dateTime || appointment.date)} {fmtTime(appointment.dateTime || appointment.date)}
              </p>
            </div>
            
            <div className="h-8 w-px bg-blue-200" />
            
            <div>
              <p className="text-xs text-gray-500">Reason</p>
              <p className="text-sm font-semibold text-gray-900 truncate max-w-xs">
                {appointment.reason || "General consultation"}
              </p>
            </div>
          </div>
          
          <div className={`px-3 py-1 rounded-full text-xs font-bold border ${
            appointment.status === "confirmed" 
              ? "bg-green-50 text-green-700 border-green-200" 
              : "bg-amber-50 text-amber-700 border-amber-200"
          }`}>
            <span className={`inline-block w-1.5 h-1.5 rounded-full mr-1 ${
              appointment.status === "confirmed" ? "bg-green-500" : "bg-amber-500"
            }`} />
            {appointment.status === "confirmed" ? "Confirmed" : "Pending"}
          </div>
        </div>
      </div>

      {/* Video Consultation Area */}
      <div className="flex-1 p-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden h-[calc(100vh-280px)]">
          {/* Placeholder for video consultation component */}
          <div className="h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="text-center max-w-md">
              <div className="w-20 h-20 rounded-full bg-blue-100 mx-auto mb-6 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Video Consultation</h3>
              <p className="text-sm text-gray-500 mb-6">
                The video consultation interface will appear here once integrated with Agora SDK.
              </p>
              
              {/* Placeholder Call Controls */}
              <div className="flex items-center justify-center gap-4">
                <button className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </button>
                <button className="w-12 h-12 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors flex items-center justify-center">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 5 5 0 00-2.45-4.3l-2.55-1.27a1 5 5 0 00-5.5.95l-1.27 1.27A1 5 5 0 018.58 12.3l-1.27-1.27A1 5 5 0 004.3 9.58L3.03 7.03A1 5 5 0 003 5z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
