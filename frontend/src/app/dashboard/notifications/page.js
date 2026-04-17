"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/services/api";

const STATUS_STYLES = {
  SENT: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
};

function formatTimestamp(value) {
  if (!value) return "Unknown time";

  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getChannelMeta(channel) {
  if (channel === "SMS") {
    return {
      label: "SMS",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 4v-4z"
          />
        </svg>
      ),
      className: "bg-amber-100 text-amber-700",
    };
  }

  if (channel === "BOTH") {
    return {
      label: "Email + SMS",
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z"
          />
        </svg>
      ),
      className: "bg-blue-100 text-blue-700",
    };
  }

  return {
    label: "Email",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8m-2 10H5a2 2 0 01-2-2V8a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2z"
        />
      </svg>
    ),
    className: "bg-sky-100 text-sky-700",
  };
}

export default function PatientNotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await api.get("/patients/notifications");
      setNotifications(response.data.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setError(err.response?.data?.message || "Could not load your notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 rounded-3xl px-6 py-8 text-white shadow-lg shadow-blue-900/10">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">
          Patient Notifications
        </p>
        <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold">Your notification inbox</h1>
        <p className="mt-2 text-sm text-blue-100 max-w-2xl">
          Review messages sent to you by the admin team and system notification events in one place.
        </p>
      </div>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-blue-50/40">
          <div>
            <h2 className="text-sm font-bold text-gray-900">All notifications</h2>
            <p className="text-xs text-gray-500 mt-1">
              Latest updates delivered to your account
            </p>
          </div>
          <button
            onClick={fetchNotifications}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-60"
          >
            <svg className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="border border-gray-100 rounded-2xl p-4 animate-pulse">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-gray-100 shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 w-48 bg-gray-100 rounded" />
                    <div className="h-3 w-full bg-gray-50 rounded" />
                    <div className="h-3 w-2/3 bg-gray-50 rounded" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-6">
            <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-4 text-sm text-red-700">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="font-semibold">Notifications could not be loaded</p>
                  <p className="mt-1 text-red-600">{error}</p>
                </div>
              </div>
            </div>
          </div>
        ) : notifications.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h3 className="mt-4 text-sm font-semibold text-gray-900">No notifications yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              New admin messages and system updates will appear here.
            </p>
          </div>
        ) : (
          <div className="max-h-[70vh] overflow-y-auto p-5 space-y-3">
            {notifications.map((notification) => {
              const channel = getChannelMeta(notification.channel);

              return (
                <div
                  key={notification.id}
                  className="border border-gray-100 rounded-2xl p-4 hover:border-blue-100 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${channel.className}`}>
                      {channel.icon}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="text-sm font-bold text-gray-900">
                              {notification.subject || "Notification"}
                            </h3>
                            <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_STYLES[notification.status] || "bg-gray-100 text-gray-600"}`}>
                              {notification.status || "UNKNOWN"}
                            </span>
                            <span className="inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium bg-gray-100 text-gray-600">
                              {channel.label}
                            </span>
                          </div>
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {notification.message || "No message content available."}
                          </p>
                        </div>

                        <div className="shrink-0 text-xs text-gray-400">
                          {formatTimestamp(notification.createdAt)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
