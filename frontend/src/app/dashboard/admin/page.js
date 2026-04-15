"use client";
import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

// ─── Skeleton Components ──────────────────────────────────────────────────────

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="animate-pulse">
      {/* Header */}
      <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-gray-50 border-b border-gray-200">
        {["User", "Role", "Status", "Actions"].map((h) => (
          <div key={h} className="h-3 bg-gray-200 rounded w-3/4" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="grid grid-cols-4 gap-4 px-5 py-4 border-b border-gray-100 items-center">
          <div>
            <div className="h-4 bg-gray-200 rounded w-28 mb-1.5" />
            <div className="h-3 bg-gray-100 rounded w-40" />
          </div>
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-5 bg-gray-100 rounded w-16" />
          <div className="flex gap-2">
            <div className="h-7 bg-gray-200 rounded w-16" />
            <div className="h-7 bg-gray-100 rounded w-14" />
          </div>
        </div>
      ))}
    </div>
  );
}

function LogSkeleton({ rows = 6 }) {
  return (
    <div className="animate-pulse p-4 space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-6 items-center">
          <div className="h-3 bg-gray-700 rounded w-20 shrink-0" />
          <div className="h-3 bg-blue-900 rounded w-32" />
          <div className="h-3 bg-gray-700 rounded w-40 flex-1" />
          <div className="h-3 bg-gray-700 rounded w-16 shrink-0" />
        </div>
      ))}
    </div>
  );
}

// ─── Badge helpers ────────────────────────────────────────────────────────────

const ROLE_BADGE = {
  admin:   "bg-purple-100 text-purple-700 border-purple-200",
  doctor:  "bg-blue-100 text-blue-700 border-blue-200",
  patient: "bg-gray-100 text-gray-600 border-gray-200",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const router   = useRouter();

  const [activeTab, setActiveTab]     = useState("users");
  const [users, setUsers]             = useState([]);
  const [logs, setLogs]               = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingLogs, setLoadingLogs]   = useState(true);
  const [actionId, setActionId]         = useState(null); // tracks which row is in-action

  // Role guard
  useEffect(() => {
    if (user && user.role !== "admin") {
      router.push("/dashboard");
    }
  }, [user, router]);

  // ── Data fetching ──────────────────────────────────────────────────────────────
  const fetchAllUsers = useCallback(async () => {
    setLoadingUsers(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/admin/users`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setUsers(res.data.users || []);
    } catch (err) {
      toast.error("Could not load user list. Please refresh.");
    } finally {
      setLoadingUsers(false);
    }
  }, []);

  const fetchSystemLogs = useCallback(async () => {
    setLoadingLogs(true);
    try {
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/notifications/logs`
      );
      setLogs(res.data.logs || []);
    } catch (err) {
      toast.error("Could not load notification logs.");
    } finally {
      setLoadingLogs(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === "admin") {
      fetchAllUsers();
      fetchSystemLogs();
    }
  }, [user, fetchAllUsers, fetchSystemLogs]);

  // ── Actions ────────────────────────────────────────────────────────────────────
  const verifyDoctor = async (id) => {
    setActionId(id);
    const loadingToast = toast.loading("Verifying doctor account…");
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/admin/doctors/${id}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.dismiss(loadingToast);
      toast.success("Doctor verified successfully! ✅");
      fetchAllUsers();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to verify doctor.");
    } finally {
      setActionId(null);
    }
  };

  const toggleUserStatus = async (id, currentlyActive) => {
    const action = currentlyActive ? "Ban" : "Unban";
    if (!confirm(`${action} this user? They will ${currentlyActive ? "lose" : "regain"} platform access.`)) return;

    setActionId(id);
    const loadingToast = toast.loading(`${action}ning user…`);
    try {
      const token = localStorage.getItem("token");
      await axios.patch(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/admin/users/${id}/status`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.dismiss(loadingToast);
      toast.success(`User ${action.toLowerCase()}ned successfully.`);
      fetchAllUsers();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || `Failed to ${action.toLowerCase()} user.`);
    } finally {
      setActionId(null);
    }
  };

  if (!user || user.role !== "admin") return null;

  return (
    <>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            borderRadius: "10px",
            background: "#1e293b",
            color: "#f8fafc",
            fontSize: "14px",
            fontWeight: 500,
          },
          success: { iconTheme: { primary: "#22c55e", secondary: "#f8fafc" } },
          error:   { iconTheme: { primary: "#ef4444", secondary: "#f8fafc" } },
          loading: { iconTheme: { primary: "#3b82f6", secondary: "#f8fafc" } },
        }}
      />

      <div className="max-w-6xl mx-auto p-4 mt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Platform Administration</h1>
            <p className="text-sm text-gray-500 mt-0.5">Manage users, verify doctors, and monitor system events.</p>
          </div>
          <button
            onClick={() => { fetchAllUsers(); fetchSystemLogs(); }}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-100 bg-gray-50">
            {[
              { key: "users", label: "User Management", count: users.length },
              { key: "logs",  label: "Notification Logs", count: logs.length },
            ].map(({ key, label, count }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`flex-1 py-4 text-sm font-bold tracking-wide transition-colors flex items-center justify-center gap-2 ${
                  activeTab === key
                    ? "bg-white text-blue-600 border-t-2 border-blue-600"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-100/60"
                }`}
              >
                {label}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                    activeTab === key ? "bg-blue-100 text-blue-700" : "bg-gray-200 text-gray-600"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ── USERS TAB ─────────────────────────────────────────────────── */}
          {activeTab === "users" && (
            loadingUsers ? (
              <TableSkeleton rows={5} />
            ) : users.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p className="text-4xl mb-3">👥</p>
                <p className="font-semibold">No users found.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {["User", "Role", "Status", "Actions"].map((h) => (
                        <th key={h} className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {users.map((u) => {
                      const isActioning = actionId === u._id;
                      return (
                        <tr key={u._id} className={`hover:bg-gray-50 transition-colors ${isActioning ? "opacity-60" : ""}`}>
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-cyan-400 flex items-center justify-center text-white text-xs font-bold shrink-0">
                                {u.name?.charAt(0).toUpperCase() || "?"}
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-sm">{u.name}</p>
                                <p className="text-xs text-gray-500">{u.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <span className={`px-2.5 py-1 rounded-full text-xs font-bold uppercase border ${ROLE_BADGE[u.role] || ROLE_BADGE.patient}`}>
                              {u.role}
                            </span>
                          </td>
                          <td className="p-4">
                            <div className="space-y-1">
                              {u.role === "doctor" && !u.isVerified && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded font-medium border border-amber-200 w-fit">
                                  ⚠️ Needs Verification
                                </span>
                              )}
                              <span className={`px-2 py-0.5 rounded text-xs font-semibold border w-fit block ${
                                u.isActive
                                  ? "bg-green-50 text-green-700 border-green-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}>
                                {u.isActive ? "● Active" : "● Banned"}
                              </span>
                            </div>
                          </td>
                          <td className="p-4">
                            <div className="flex gap-2 flex-wrap">
                              {u.role === "doctor" && !u.isVerified && (
                                <button
                                  onClick={() => verifyDoctor(u._id)}
                                  disabled={isActioning}
                                  className="px-3 py-1.5 bg-blue-600 text-white text-xs font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                >
                                  {isActioning ? "…" : "Verify"}
                                </button>
                              )}
                              {u._id !== user._id && (
                                <button
                                  onClick={() => toggleUserStatus(u._id, u.isActive)}
                                  disabled={isActioning}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors disabled:opacity-50 ${
                                    u.isActive
                                      ? "bg-white text-red-600 border-red-200 hover:bg-red-50"
                                      : "bg-white text-green-600 border-green-200 hover:bg-green-50"
                                  }`}
                                >
                                  {isActioning ? "…" : u.isActive ? "Ban" : "Unban"}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )
          )}

          {/* ── LOGS TAB ───────────────────────────────────────────────────── */}
          {activeTab === "logs" && (
            <div className="overflow-x-auto bg-gray-900 rounded-b-xl">
              {loadingLogs ? (
                <LogSkeleton rows={6} />
              ) : logs.length === 0 ? (
                <div className="text-center py-16 text-gray-500 font-mono text-sm">
                  <p className="text-3xl mb-3">📭</p>
                  <p>No notification events yet.</p>
                  <p className="text-xs mt-1 text-gray-600">Waiting for RabbitMQ events…</p>
                </div>
              ) : (
                <table className="w-full text-left font-mono text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-700">
                      <th className="p-4 pb-3">Timestamp</th>
                      <th className="p-4 pb-3">Event</th>
                      <th className="p-4 pb-3">Recipient</th>
                      <th className="p-4 pb-3">Type</th>
                      <th className="p-4 pb-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-300">
                    {logs.map((log) => (
                      <tr key={log._id} className="border-b border-gray-800 hover:bg-gray-800/60 transition-colors">
                        <td className="p-4 py-3 text-gray-500 whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleString("en-US", {
                            month: "short", day: "numeric",
                            hour: "2-digit", minute: "2-digit", second: "2-digit"
                          })}
                        </td>
                        <td className="p-4 py-3 text-blue-400 font-bold">{log.eventTrigger}</td>
                        <td className="p-4 py-3 text-gray-300">{log.recipientEmail || "—"}</td>
                        <td className="p-4 py-3">
                          <span className="px-1.5 py-0.5 bg-gray-700 text-gray-300 rounded text-[10px]">
                            {log.type}
                          </span>
                        </td>
                        <td className="p-4 py-3">
                          <span className={`font-bold ${
                            log.status === "SENT"
                              ? "text-green-400"
                              : log.status === "PENDING"
                              ? "text-amber-400"
                              : "text-red-400"
                          }`}>
                            [{log.status}]
                          </span>
                          {log.errorMessage && (
                            <p className="text-red-500 text-[10px] mt-0.5 max-w-xs truncate" title={log.errorMessage}>
                              {log.errorMessage}
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}