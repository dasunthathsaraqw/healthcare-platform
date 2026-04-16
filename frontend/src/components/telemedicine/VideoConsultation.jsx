"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import AgoraRTC from "agora-rtc-sdk-ng";
import ChatPanel from "./ChatPanel";

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

function getJoinErrorMessage(err) {
  const apiMessage = err?.response?.data?.message || err?.response?.data?.error;
  if (apiMessage) return apiMessage;

  const sdkMessage = err?.message || "";
  if (/permission|notallowed|denied/i.test(sdkMessage)) {
    return "Camera or microphone permission was denied. Please allow access and try again.";
  }

  return sdkMessage || "Failed to join video call";
}

const CALL_STATUS = {
  CONNECTING: "connecting",
  WAITING: "waiting",
  CONNECTED: "connected",
  ENDED: "ended",
  ERROR: "error",
};

const STATUS_CONFIG = {
  [CALL_STATUS.CONNECTING]: {
    label: "Connecting...",
    color: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  [CALL_STATUS.WAITING]: {
    label: "Waiting for participant...",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
  [CALL_STATUS.CONNECTED]: {
    label: "Connected",
    color: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-400",
  },
  [CALL_STATUS.ENDED]: {
    label: "Call Ended",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
  },
  [CALL_STATUS.ERROR]: {
    label: "Connection Error",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
  },
};

export default function VideoConsultation({ appointmentId, onLeave, userRole = "patient", doctorName = "Doctor" }) {
  const [callStatus, setCallStatus] = useState(CALL_STATUS.CONNECTING);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [error, setError] = useState("");
  const [remoteUserJoined, setRemoteUserJoined] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  
  const clientRef = useRef(null);
  const localAudioTrackRef = useRef(null);
  const localVideoTrackRef = useRef(null);
  const remoteAudioTrackRef = useRef(null);
  const remoteVideoTrackRef = useRef(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  const cleanupSession = useCallback(async () => {
    // Stop and close local tracks
    if (localAudioTrackRef.current) {
      localAudioTrackRef.current.stop();
      localAudioTrackRef.current.close();
      localAudioTrackRef.current = null;
    }
    if (localVideoTrackRef.current) {
      localVideoTrackRef.current.stop();
      localVideoTrackRef.current.close();
      localVideoTrackRef.current = null;
    }

    // Stop remote tracks
    if (remoteAudioTrackRef.current) {
      remoteAudioTrackRef.current.stop();
      remoteAudioTrackRef.current = null;
    }
    if (remoteVideoTrackRef.current) {
      remoteVideoTrackRef.current.stop();
      remoteVideoTrackRef.current = null;
    }

    // Leave channel and destroy client
    if (clientRef.current) {
      await clientRef.current.leave();
      clientRef.current.removeAllListeners();
      clientRef.current = null;
    }
  }, []);

  // Initialize Agora client and join session
  const initializeSession = useCallback(async () => {
    try {
      setCallStatus(CALL_STATUS.CONNECTING);
      setError("");

      // Get Agora credentials from backend via the join endpoint
      // Passing uid: 0 ensures Agora assigns a unique user ID, preventing collisions
      const response = await axios.post(
        `${API_BASE}/telemedicine/sessions/${appointmentId}/join`,
        { uid: 0 },
        { headers: authHeaders() }
      );
      
      // API returns { success, data: { appId, channelName, token, uid, ... } }
      const sessionData = response.data?.data || response.data;
      const { appId, channelName, token, uid } = sessionData;
      
      if (!appId || !channelName || !token) {
        throw new Error("Invalid session data from server");
      }

      // Create Agora client
      const client = AgoraRTC.createClient({
        mode: "rtc",
        codec: "vp8",
      });
      clientRef.current = client;

      // Set up event listeners
      client.on("user-published", handleUserPublished);
      client.on("user-unpublished", handleUserUnpublished);
      client.on("user-joined", handleUserJoined);
      client.on("user-left", handleUserLeft);
      client.on("connection-state-change", handleConnectionStateChange);

      // Join channel
      await client.join(appId, channelName, token, uid);
      
      // Create and publish local tracks
      const [localAudioTrack, localVideoTrack] = await Promise.all([
        AgoraRTC.createMicrophoneAudioTrack(),
        AgoraRTC.createCameraVideoTrack(),
      ]);

      localAudioTrackRef.current = localAudioTrack;
      localVideoTrackRef.current = localVideoTrack;

      // Publish local tracks
      await client.publish([localAudioTrack, localVideoTrack]);

      // Play local video
      if (localVideoRef.current) {
        localVideoTrack.play(localVideoRef.current);
      }

      setCallStatus(CALL_STATUS.WAITING);
      
    } catch (err) {
      console.error("Failed to initialize session:", err);
      setError(getJoinErrorMessage(err));
      setCallStatus(CALL_STATUS.ERROR);
    }
  }, [appointmentId]);

  // Handle remote user publishing tracks
  const handleUserPublished = async (user, mediaType) => {
    try {
      if (mediaType === "video") {
        const remoteVideoTrack = await clientRef.current.subscribe(user, mediaType);
        remoteVideoTrackRef.current = remoteVideoTrack;
        
        if (remoteVideoRef.current) {
          remoteVideoTrack.play(remoteVideoRef.current);
        } else {
          console.error("remoteVideoRef is null, cannot play video track");
        }
        
        setRemoteUserJoined(true);
        setCallStatus(CALL_STATUS.CONNECTED);
      } else if (mediaType === "audio") {
        const remoteAudioTrack = await clientRef.current.subscribe(user, mediaType);
        remoteAudioTrackRef.current = remoteAudioTrack;
        remoteAudioTrack.play();
      }
    } catch (err) {
      console.error("Failed to subscribe to remote user:", err);
    }
  };

  // Handle remote user unpublishing tracks
  const handleUserUnpublished = (user, mediaType) => {
    if (mediaType === "video") {
      if (remoteVideoTrackRef.current) {
        remoteVideoTrackRef.current.stop();
        // DO NOT call .close() on remote tracks! Only local tracks.
        // remoteVideoTrackRef.current.close();
        remoteVideoTrackRef.current = null;
      }
      setRemoteUserJoined(false);
      setCallStatus(CALL_STATUS.WAITING);
    } else if (mediaType === "audio") {
      if (remoteAudioTrackRef.current) {
        remoteAudioTrackRef.current.stop();
        // remoteAudioTrackRef.current.close();
        remoteAudioTrackRef.current = null;
      }
    }
  };

  // Handle user joined event
  const handleUserJoined = (user) => {
    console.log("User joined:", user.uid);
    setRemoteUserJoined(true);
    if (callStatus === CALL_STATUS.WAITING) {
      setCallStatus(CALL_STATUS.CONNECTED);
    }
  };

  // Handle user left event
  const handleUserLeft = (user) => {
    console.log("User left:", user.uid);
    setRemoteUserJoined(false);
    setCallStatus(CALL_STATUS.WAITING);
  };

  // Handle connection state changes
  const handleConnectionStateChange = (newState, reason) => {
    console.log("Connection state changed:", newState, reason);
    
    if (newState === "CONNECTED") {
      setCallStatus(CALL_STATUS.CONNECTED);
    } else if (newState === "DISCONNECTED") {
      setCallStatus(CALL_STATUS.ENDED);
    } else if (newState === "FAILED") {
      setCallStatus(CALL_STATUS.ERROR);
      setError(reason || "Connection failed");
    }
  };

  // Toggle microphone
  const toggleMicrophone = () => {
    if (localAudioTrackRef.current) {
      if (isMuted) {
        localAudioTrackRef.current.setMuted(false);
        setIsMuted(false);
      } else {
        localAudioTrackRef.current.setMuted(true);
        setIsMuted(true);
      }
    }
  };

  // Toggle camera
  const toggleCamera = () => {
    if (localVideoTrackRef.current) {
      if (isCameraOff) {
        localVideoTrackRef.current.setEnabled(true);
        setIsCameraOff(false);
      } else {
        localVideoTrackRef.current.setEnabled(false);
        setIsCameraOff(true);
      }
    }
  };

  // Leave call
  const leaveCall = useCallback(async () => {
    try {
      await cleanupSession();

      setCallStatus(CALL_STATUS.ENDED);
      
      // Call onLeave callback after cleanup
      setTimeout(() => {
        onLeave?.();
      }, 1000);
      
    } catch (err) {
      console.error("Error leaving call:", err);
      onLeave?.();
    }
  }, [cleanupSession, onLeave]);

  // Initialize session on component mount
  useEffect(() => {
    if (appointmentId) {
      initializeSession();
    }

    // Cleanup on unmount
    return () => {
      cleanupSession().catch((err) => {
        console.error("Error during session cleanup:", err);
      });
    };
  }, [appointmentId, cleanupSession, initializeSession]);

  const statusConfig = STATUS_CONFIG[callStatus] || STATUS_CONFIG[CALL_STATUS.CONNECTING];

  const otherParty = userRole === "doctor" ? "Patient" : doctorName;

  return (
    <div className="h-full flex flex-col bg-gray-900">
      {/* Status Bar */}
      <div className="bg-gray-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${statusConfig.dot} ${callStatus === CALL_STATUS.CONNECTING ? 'animate-pulse' : ''}`} />
          <span className={`text-xs font-medium px-2 py-1 rounded-full border ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{userRole === "doctor" ? "Doctor View" : "Patient View"}</span>
          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen((o) => !o)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              chatOpen ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title="Toggle Chat"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            Chat
          </button>
        </div>
      </div>

      {/* Main content: Video + optional Chat */}
      <div className="flex-1 flex overflow-hidden min-h-0">

      {/* Video Area */}
      <div className="flex-1 relative bg-black">
        {/* Remote Video (Main) */}
        <div className="absolute inset-0">
          {/* Always render the video container so the ref is immediately available */}
          <div
            ref={remoteVideoRef}
            className={`w-full h-full ${remoteUserJoined ? "block" : "hidden"}`}
            style={{ objectFit: "cover" }}
          />
          
          {/* Placeholder for when no remote user is joined */}
          {!remoteUserJoined && (
            <div className="w-full h-full flex items-center justify-center absolute inset-0 bg-black z-10">
              <div className="text-center">
                <div className="w-16 h-16 rounded-full bg-gray-800 mx-auto mb-4 flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <p className="text-gray-400 text-sm">
                  {callStatus === CALL_STATUS.WAITING ? "Waiting for other participant to join..." : "No remote video"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Local Video (Picture-in-Picture) */}
        <div className="absolute top-4 right-4 w-32 h-24 sm:w-48 sm:h-36 bg-gray-800 rounded-lg overflow-hidden shadow-lg">
          {isCameraOff ? (
            <div className="w-full h-full flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          ) : (
            <div
              ref={localVideoRef}
              className="w-full h-full"
              style={{ objectFit: "cover", transform: "scaleX(-1)" }}
            />
          )}
          {isMuted && (
            <div className="absolute bottom-2 left-2 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center">
              <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <div className="absolute top-4 left-4 bg-red-900/90 text-red-200 px-4 py-3 rounded-lg max-w-md">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium">Connection Error</p>
                <p className="text-xs mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Chat Side Panel */}
      {chatOpen && (
        <div className="w-80 shrink-0 flex flex-col border-l border-gray-700">
          <ChatPanel
            appointmentId={appointmentId}
            otherPartyName={otherParty}
            className="flex-1 h-full"
          />
        </div>
      )}

      </div>{/* end main content row */}

      {/* Call Controls */}
      <div className="bg-gray-800 px-4 py-4">
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={toggleMicrophone}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isMuted
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title={isMuted ? "Unmute microphone" : "Mute microphone"}
          >
            {isMuted ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            )}
          </button>

          <button
            onClick={toggleCamera}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
              isCameraOff
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
            }`}
            title={isCameraOff ? "Turn on camera" : "Turn off camera"}
          >
            {isCameraOff ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            )}
          </button>

          <button
            onClick={leaveCall}
            className="w-14 h-14 rounded-full bg-red-600 text-white hover:bg-red-700 transition-colors flex items-center justify-center"
            title="Leave call"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 5 5 0 00-2.45-4.3l-2.55-1.27a1 5 1 0 00-5.5.95l-1.27 1.27A1 5 1 0 018.58 12.3l-1.27-1.27A1 5 1 0 004.3 9.58L3.03 7.03A1 5 1 0 003 5z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
