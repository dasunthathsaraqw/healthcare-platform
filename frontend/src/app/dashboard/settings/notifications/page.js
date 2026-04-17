"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import api from "@/services/api";

function Toggle({ enabled, onChange, label, description, disabled = false }) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="text-sm font-semibold text-gray-900">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ease-in-out shrink-0 disabled:opacity-60
          ${enabled ? "bg-blue-600" : "bg-gray-300"}`}
        role="switch"
        aria-checked={enabled}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200
            ${enabled ? "translate-x-5" : "translate-x-0"}`}
        />
      </button>
    </div>
  );
}

const EVENT_LABELS = {
  REPORT_UPLOADED: { label: "Report Uploaded", desc: "When a new medical report is added to your vault", icon: "Report" },
  APPOINTMENT_BOOKED: { label: "Appointment Booked", desc: "Confirmation when an appointment is scheduled", icon: "Appt" },
  APPOINTMENT_CANCELLED: { label: "Appointment Cancelled", desc: "When an appointment is cancelled", icon: "Cancel" },
  PRESCRIPTION_ISSUED: { label: "New Prescription", desc: "When a doctor issues a prescription for you", icon: "Rx" },
  SYSTEM_ALERT: { label: "System Alerts", desc: "Important platform updates and security notices", icon: "Alert" },
};

const DEFAULT_PREFS = {
  emailEnabled: true,
  smsEnabled: false,
  eventPreferences: {
    REPORT_UPLOADED: true,
    APPOINTMENT_BOOKED: true,
    APPOINTMENT_CANCELLED: true,
    PRESCRIPTION_ISSUED: true,
    SYSTEM_ALERT: true,
  },
  quietHoursStart: null,
  quietHoursEnd: null,
};

export default function NotificationPreferencesPage() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const successTimeoutRef = useRef(null);

  const fetchPrefs = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/notifications/preferences");
      setPrefs({ ...DEFAULT_PREFS, ...res.data.preferences });
    } catch (err) {
      console.error("Failed to load preferences:", err);
      setPrefs(DEFAULT_PREFS);
      setError(err.response?.data?.message || "Could not load preferences. Showing defaults.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefs();
    return () => window.clearTimeout(successTimeoutRef.current);
  }, [fetchPrefs]);

  const savePrefs = async (updatedFields, nextPrefs) => {
    setSaving(true);
    setError("");
    try {
      const res = await api.put("/notifications/preferences", updatedFields);
      setPrefs({ ...DEFAULT_PREFS, ...res.data.preferences });
      setSuccess("Preferences saved!");
      window.clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = window.setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setPrefs(nextPrefs);
      setError(err.response?.data?.message || "Failed to save preferences.");
    } finally {
      setSaving(false);
    }
  };

  const updatePrefs = (updater, payloadBuilder) => {
    const previousPrefs = prefs;
    const nextPrefs = updater(previousPrefs);
    setPrefs(nextPrefs);
    savePrefs(payloadBuilder(nextPrefs), previousPrefs);
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="h-8 w-64 bg-gray-200 rounded animate-pulse" />
        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4 animate-pulse">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-14 bg-gray-100 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Preferences</h1>
        <p className="text-sm text-gray-500 mt-1">Control how and when you receive alerts from MediCare.</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          Preferences saved successfully.
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600 font-medium">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Delivery Channels</h2>
        <p className="text-xs text-gray-400 mb-3">Choose how notifications are delivered to you.</p>
        <Toggle
          enabled={prefs.emailEnabled}
          disabled={saving}
          onChange={(value) =>
            updatePrefs(
              (current) => ({ ...current, emailEnabled: value }),
              () => ({ emailEnabled: value })
            )
          }
          label="Email Notifications"
          description="Receive alerts at your registered email address"
        />
        <Toggle
          enabled={prefs.smsEnabled}
          disabled={saving}
          onChange={(value) =>
            updatePrefs(
              (current) => ({ ...current, smsEnabled: value }),
              () => ({ smsEnabled: value })
            )
          }
          label="SMS Notifications"
          description="Receive text messages for urgent alerts when SMS delivery is available"
        />
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Event Alerts</h2>
        <p className="text-xs text-gray-400 mb-3">Choose which events should trigger notifications.</p>
        {Object.entries(EVENT_LABELS).map(([key, { label, desc, icon }]) => (
          <Toggle
            key={key}
            enabled={prefs.eventPreferences?.[key] ?? true}
            disabled={saving}
            onChange={(value) =>
              updatePrefs(
                (current) => ({
                  ...current,
                  eventPreferences: { ...current.eventPreferences, [key]: value },
                }),
                (next) => ({ eventPreferences: { [key]: next.eventPreferences[key] } })
              )
            }
            label={`${icon} ${label}`}
            description={desc}
          />
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-1">Quiet Hours</h2>
        <p className="text-xs text-gray-400 mb-4">Suppress notifications during the selected time window.</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Start</label>
            <input
              type="time"
              value={prefs.quietHoursStart || ""}
              onChange={(e) => {
                const value = e.target.value || null;
                updatePrefs(
                  (current) => ({ ...current, quietHoursStart: value }),
                  () => ({ quietHoursStart: value })
                );
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">End</label>
            <input
              type="time"
              value={prefs.quietHoursEnd || ""}
              onChange={(e) => {
                const value = e.target.value || null;
                updatePrefs(
                  (current) => ({ ...current, quietHoursEnd: value }),
                  () => ({ quietHoursEnd: value })
                );
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
            />
          </div>
        </div>
      </div>

      {saving && (
        <div className="text-center">
          <span className="inline-flex items-center gap-2 text-xs text-blue-600 font-medium">
            <svg className="w-3 h-3 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            Saving preferences...
          </span>
        </div>
      )}
    </div>
  );
}
