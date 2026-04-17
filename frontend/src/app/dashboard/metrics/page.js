"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";

// ── Metric Type Config ────────────────────────────────────────────────────────

const METRIC_TYPES = [
  { key: "blood_pressure", label: "Blood Pressure", unit: "mmHg", icon: "❤️", color: "red" },
  { key: "weight", label: "Body Weight", unit: "kg", icon: "⚖️", color: "blue" },
  { key: "heart_rate", label: "Heart Rate", unit: "bpm", icon: "💓", color: "purple" },
];

const COLOR_MAP = {
  red: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200", bar: "bg-red-500" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200", bar: "bg-blue-500" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", bar: "bg-purple-500" },
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function HealthMetricsPage() {
  const [metrics, setMetrics] = useState([]);
  const [chartMetrics, setChartMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [weightVal, setWeightVal] = useState("");
  const [heartRate, setHeartRate] = useState("");
  const [notes, setNotes] = useState("");
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [activeType, setActiveType] = useState("blood_pressure");
  const [days, setDays] = useState(30);

  const activeConfig = METRIC_TYPES.find((t) => t.key === activeType);

  const getArrayFromResponse = (data, key) => {
    if (Array.isArray(data?.[key])) return data[key];
    if (Array.isArray(data?.data?.[key])) return data.data[key];
    if (Array.isArray(data?.data) && key === "data") return data.data;
    if (Array.isArray(data?.metrics) && key === "metrics") return data.metrics;
    return [];
  };

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get("/patients/metrics", {
        params: { type: activeType, days },
      });
      setMetrics(getArrayFromResponse(res.data, "metrics"));
    } catch (err) {
      console.error("Failed to load metrics:", err);
      setMetrics([]);
    } finally {
      setLoading(false);
    }
  }, [activeType, days]);

  const fetchChartMetrics = useCallback(async () => {
    try {
      const res = await api.get("/patients/metrics/chart", {
        params: { type: activeType, period: days },
      });
      setChartMetrics(getArrayFromResponse(res.data, "data"));
    } catch (err) {
      console.error("Failed to load chart metrics:", err);
      setChartMetrics([]);
    }
  }, [activeType, days]);

  useEffect(() => {
    fetchMetrics();
    fetchChartMetrics();
  }, [fetchMetrics, fetchChartMetrics]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    let value, unit;
    if (activeType === "blood_pressure") {
      if (!systolic || !diastolic) { setFormError("Both systolic and diastolic are required."); return; }
      value = { systolic: Number(systolic), diastolic: Number(diastolic) };
      unit = "mmHg";
    } else if (activeType === "weight") {
      if (!weightVal) { setFormError("Weight is required."); return; }
      value = Number(weightVal);
      unit = "kg";
    } else {
      if (!heartRate) { setFormError("Heart rate is required."); return; }
      value = Number(heartRate);
      unit = "bpm";
    }

    setSaving(true);
    try {
      await api.post("/patients/metrics", {
        type: activeType, value, unit, notes,
      });

      setSuccess("Metric logged successfully!");
      setSystolic(""); setDiastolic(""); setWeightVal(""); setHeartRate(""); setNotes("");
      await fetchMetrics();
      await fetchChartMetrics();
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setFormError(err.response?.data?.message || "Failed to log metric.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await api.delete(`/patients/metrics/${id}`);
      setMetrics((prev) => prev.filter((m) => m._id !== id));
      await Promise.all([fetchMetrics(), fetchChartMetrics()]);
    } catch (err) {
      console.error("Failed to delete metric:", err);
      alert("Failed to delete.");
    }
  };

  const colors = COLOR_MAP[activeConfig?.color || "blue"];

  const formatValue = (m) => {
    if (!m) return "—";

    if (m.type === "blood_pressure" && m.value && typeof m.value === "object") {
      return `${m.value.systolic}/${m.value.diastolic}`;
    }
    return m.value;
  };

  const formatRecordedAt = (recordedAt) => {
    const date = new Date(recordedAt);
    if (Number.isNaN(date.getTime())) return "Unknown date";

    return `${date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}`;
  };

  // Simple stats
  const latest = metrics[0];
  const avg = metrics.length
    ? activeType === "blood_pressure"
      ? `${Math.round(metrics.reduce((s, m) => s + (m.value?.systolic || 0), 0) / metrics.length)}/${Math.round(metrics.reduce((s, m) => s + (m.value?.diastolic || 0), 0) / metrics.length)}`
      : Math.round(metrics.reduce((s, m) => s + (typeof m.value === 'number' ? m.value : 0), 0) / metrics.length)
    : "—";

  const chartValues = chartMetrics
    .slice(0, 20)
    .map((item) => {
      if (activeType === "blood_pressure") {
        return typeof item?.value === "object" ? (item.value?.systolic || 0) : 0;
      }
      return typeof item?.value === "number" ? item.value : Number(item?.value) || 0;
    });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Health Metrics Tracker</h1>
        <p className="text-sm text-gray-500 mt-1">Log and monitor your daily vitals — blood pressure, weight, and heart rate.</p>
      </div>

      {/* Type tabs */}
      <div className="flex gap-3 flex-wrap">
        {METRIC_TYPES.map((t) => {
          const active = activeType === t.key;
          const c = COLOR_MAP[t.color];
          return (
            <button key={t.key} onClick={() => setActiveType(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-all duration-200
                ${active
                  ? `${c.bg} ${c.text} ${c.border} shadow-sm`
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
            >
              <span className="text-lg">{t.icon}</span>
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Success / Error banners */}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 font-medium">
          ✅ {success}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT: Log Form */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <span className="text-lg">{activeConfig?.icon}</span>
              Log {activeConfig?.label}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-3">
              {activeType === "blood_pressure" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Systolic</label>
                    <input type="number" placeholder="120" value={systolic}
                      onChange={(e) => setSystolic(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 border bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:text-gray-900 focus:border-blue-500" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Diastolic</label>
                    <input type="number" placeholder="80" value={diastolic}
                      onChange={(e) => setDiastolic(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl text-sm outline-none transition-all duration-200 border bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:text-gray-900 focus:border-blue-500" />
                  </div>
                </div>
              )}

              {activeType === "weight" && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Weight (kg)</label>
                  <input type="number" step="0.1" placeholder="72.5" value={weightVal}
                    onChange={(e) => setWeightVal(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
                </div>
              )}

              {activeType === "heart_rate" && (
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Heart Rate (bpm)</label>
                  <input type="number" placeholder="72" value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Notes (optional)</label>
                <input type="text" placeholder="After morning walk..." value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
              </div>

              {formError && <p className="text-xs text-red-500 font-medium">{formError}</p>}

              <button type="submit" disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm">
                {saving ? (
                  <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg> Saving...</>
                ) : "Log Entry"}
              </button>
            </form>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className={`${colors.bg} rounded-2xl p-4 border ${colors.border}`}>
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Latest</p>
              <p className={`text-xl font-bold ${colors.text} mt-0.5`}>{latest ? formatValue(latest) : "—"}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{activeConfig?.unit}</p>
            </div>
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
              <p className="text-[10px] font-semibold text-gray-400 uppercase">Average ({days}d)</p>
              <p className="text-xl font-bold text-gray-800 mt-0.5">{avg}</p>
              <p className="text-[10px] text-gray-400 mt-0.5">{activeConfig?.unit}</p>
            </div>
          </div>
        </div>

        {/* RIGHT: History */}
        <div className="lg:col-span-2">
          {/* Chart placeholder */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-gray-900">Trend Overview</h2>
              <select value={days} onChange={(e) => setDays(Number(e.target.value))}
                className="px-3 py-1.5 rounded-lg text-xs outline-none transition-all duration-200 border bg-white text-gray-900 border-gray-300 placeholder-gray-400 focus:text-gray-900 focus:border-blue-500">
                <option className="bg-white text-gray-900" value={7}>Last 7 days</option>
                <option className="bg-white text-gray-900" value={14}>Last 14 days</option>
                <option className="bg-white text-gray-900" value={30}>Last 30 days</option>
                <option className="bg-white text-gray-900" value={90}>Last 90 days</option>
              </select>
            </div>
            {/* Visual bar chart placeholder */}
            <div className="h-40 bg-linear-to-t from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200 flex items-end justify-center gap-1 px-4 pb-4">
              {chartValues.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <p className="text-xs text-gray-400 font-medium">No data for this period</p>
                  <p className="text-[10px] text-gray-300 mt-0.5">Log entries to see your trend</p>
                </div>
              ) : (
                chartMetrics.slice(0, 20).map((m, i) => {
                  const val = activeType === "blood_pressure"
                    ? (typeof m.value === "object" ? (m.value?.systolic || 0) : 0)
                    : (typeof m.value === 'number' ? m.value : Number(m.value) || 0);
                  const maxVal = activeType === "blood_pressure" ? 200 : activeType === "weight" ? 150 : 200;
                  const pct = Math.min(100, Math.max(10, (val / maxVal) * 100));
                  return (
                    <div key={m._id || m.date || i} className="flex-1 max-w-3 flex flex-col items-center gap-1">
                      <div
                        className={`w-full rounded-t-sm ${colors.bar} opacity-70 hover:opacity-100 transition-opacity duration-200`}
                        style={{ height: `${pct}%` }}
                        title={`${formatValue(m)} ${activeConfig?.unit}`}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Log entries table */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-bold text-gray-900">Log Entries</h2>
              <span className="text-xs text-gray-400">{metrics.length} records</span>
            </div>

            {loading ? (
              <div className="p-5 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : metrics.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm font-semibold text-gray-600">No entries yet</p>
                <p className="text-xs text-gray-400 mt-1">Use the form on the left to log your first reading.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-100 overflow-y-auto">
                {metrics.map((m) => (
                  <div key={m._id} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/60 transition-colors duration-200">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-xl ${colors.bg} ${colors.border} border flex items-center justify-center text-base shrink-0`}>
                        {activeConfig?.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-gray-900">
                          {formatValue(m)} <span className="text-xs font-normal text-gray-400">{m.unit}</span>
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">
                          {formatRecordedAt(m.recordedAt)}
                          {m.notes ? ` · ${m.notes}` : ""}
                        </p>
                      </div>
                    </div>
                    <button type="button" onClick={() => handleDelete(m._id)}
                      className="text-[10px] text-red-400 hover:text-red-600 font-semibold hover:underline transition-colors shrink-0">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
