"use client";

import { forwardRef } from "react";

const CallControls = forwardRef(function CallControls(
  {
    isMuted = false,
    isCameraOff = false,
    callStatus = "connecting",
    onToggleMicrophone,
    onToggleCamera,
    onLeaveCall,
    disabled = false,
    className = "",
  },
  ref
) {
  const getMicrophoneIcon = () => {
    if (isMuted) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    );
  };

  const getCameraIcon = () => {
    if (isCameraOff) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    );
  };

  const getLeaveCallIcon = () => (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 5 1 0 00-2.45-4.3l-2.55-1.27a1 5 1 0 00-5.5.95l-1.27 1.27A1 5 1 0 018.58 12.3l-1.27-1.27A1 5 1 0 004.3 9.58L3.03 7.03A1 5 1 0 003 5z" />
    </svg>
  );

  const getMicrophoneTitle = () => {
    if (disabled) return "Microphone unavailable";
    return isMuted ? "Unmute microphone" : "Mute microphone";
  };

  const getCameraTitle = () => {
    if (disabled) return "Camera unavailable";
    return isCameraOff ? "Turn on camera" : "Turn off camera";
  };

  const getLeaveCallTitle = () => {
    if (disabled) return "Cannot leave call";
    return "Leave call";
  };

  return (
    <div
      ref={ref}
      className={`flex items-center justify-center gap-4 ${className}`}
    >
      {/* Microphone Button */}
      <button
        onClick={onToggleMicrophone}
        disabled={disabled}
        title={getMicrophoneTitle()}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
          disabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
            : isMuted
            ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        {getMicrophoneIcon()}
      </button>

      {/* Camera Button */}
      <button
        onClick={onToggleCamera}
        disabled={disabled}
        title={getCameraTitle()}
        className={`w-12 h-12 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
          disabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
            : isCameraOff
            ? "bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200"
            : "bg-gray-700 text-gray-300 hover:bg-gray-600"
        }`}
      >
        {getCameraIcon()}
      </button>

      {/* Leave Call Button */}
      <button
        onClick={onLeaveCall}
        disabled={disabled}
        title={getLeaveCallTitle()}
        className={`w-14 h-14 rounded-full flex items-center justify-center transition-all transform hover:scale-105 active:scale-95 ${
          disabled
            ? "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
            : "bg-red-600 text-white hover:bg-red-700 shadow-xl shadow-red-200"
        }`}
      >
        {getLeaveCallIcon()}
      </button>
    </div>
  );
});

CallControls.displayName = "CallControls";

export default CallControls;
