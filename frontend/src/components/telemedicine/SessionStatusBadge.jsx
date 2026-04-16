"use client";

import { forwardRef } from "react";

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
    animate: true,
  },
  [CALL_STATUS.WAITING]: {
    label: "Waiting for participant...",
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
    animate: false,
  },
  [CALL_STATUS.CONNECTED]: {
    label: "Connected",
    color: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-400",
    animate: false,
  },
  [CALL_STATUS.ENDED]: {
    label: "Call Ended",
    color: "bg-gray-100 text-gray-600 border-gray-200",
    dot: "bg-gray-400",
    animate: false,
  },
  [CALL_STATUS.ERROR]: {
    label: "Connection Error",
    color: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-400",
    animate: true,
  },
};

const SessionStatusBadge = forwardRef(function SessionStatusBadge(
  {
    status = CALL_STATUS.CONNECTING,
    showLabel = true,
    size = "md",
    className = "",
    customLabel,
    showDot = true,
  },
  ref
) {
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG[CALL_STATUS.CONNECTING];
  const label = customLabel || statusConfig.label;

  const sizeClasses = {
    sm: {
      container: "px-2 py-1 text-xs",
      dot: "w-1.5 h-1.5",
    },
    md: {
      container: "px-3 py-1.5 text-sm",
      dot: "w-2 h-2",
    },
    lg: {
      container: "px-4 py-2 text-base",
      dot: "w-2.5 h-2.5",
    },
  };

  const currentSize = sizeClasses[size] || sizeClasses.md;

  return (
    <div
      ref={ref}
      className={`inline-flex items-center gap-2 rounded-full border font-medium ${statusConfig.color} ${currentSize.container} ${className}`}
    >
      {showDot && (
        <span
          className={`inline-block rounded-full ${statusConfig.dot} ${currentSize.dot} ${
            statusConfig.animate ? "animate-pulse" : ""
          }`}
        />
      )}
      {showLabel && <span>{label}</span>}
    </div>
  );
});

SessionStatusBadge.displayName = "SessionStatusBadge";

export default SessionStatusBadge;
export { CALL_STATUS, STATUS_CONFIG };
