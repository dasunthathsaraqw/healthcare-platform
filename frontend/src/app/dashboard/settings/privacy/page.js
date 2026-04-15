"use client";

import { useState, useEffect } from "react";
import axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

function authHeaders() {
  const t = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${t}` };
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PrivacyPage() {
  const [user, setUser]               = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded]   = useState(false);

  // Password change
  const [currentPw, setCurrentPw]   = useState("");
  const [newPw, setNewPw]           = useState("");
  const [confirmPw, setConfirmPw]   = useState("");
  const [pwError, setPwError]       = useState("");
  const [pwSuccess, setPwSuccess]   = useState("");
  const [pwSaving, setPwSaving]     = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  // ── Download My Data ───────────────────────────────────────────────────────

  const handleExport = async () => {
    setDownloading(true);
    try {
      const res = await axios.get(`${API_BASE}/patients/export`, {
        headers: authHeaders(),
      });

      // Trigger file download
      const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `patient-data-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export data. Please try again.");
    } finally {
      setDownloading(false);
    }
  };

  // ── Change Password ────────────────────────────────────────────────────────

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required."); return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters."); return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match."); return;
    }

    setPwSaving(true);
    try {
      await axios.put(`${API_BASE}/auth/change-password`, {
        currentPassword: currentPw,
        newPassword: newPw,
      }, { headers: authHeaders() });

      setPwSuccess("Password changed successfully!");
      setCurrentPw(""); setNewPw(""); setConfirmPw("");
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Export & Privacy</h1>
        <p className="text-sm text-gray-500 mt-1">Download your data, manage your security settings, and control your account.</p>
      </div>

      {/* ── Data Export Card ────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shrink-0">
            📦
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Download My Data</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Export a complete copy of your personal data, including your profile, medical history,
              uploaded reports, and health metrics. The file is in JSON format, compliant with GDPR data portability requirements.
            </p>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleExport}
                disabled={downloading}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold
                  hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                    Preparing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    Download My Data
                  </>
                )}
              </button>

              {downloaded && (
                <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                  ✅ Export downloaded!
                </span>
              )}
            </div>

            {/* What's included */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">What&apos;s included in your export</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span className="flex items-center gap-1.5">✓ Personal profile</span>
                <span className="flex items-center gap-1.5">✓ Medical history</span>
                <span className="flex items-center gap-1.5">✓ Uploaded reports</span>
                <span className="flex items-center gap-1.5">✓ Health metrics</span>
                <span className="flex items-center gap-1.5">✓ Account metadata</span>
                <span className="flex items-center gap-1.5">✓ GDPR format</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Change Password Card ───────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shrink-0">
            🔒
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-500 mt-1">Update your account password. You will need your current password to proceed.</p>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 max-w-sm">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Current Password</label>
                <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">New Password</label>
                <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Confirm New Password</label>
                <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200" />
              </div>

              {pwError && <p className="text-xs text-red-500 font-medium">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-600 font-medium">✅ {pwSuccess}</p>}

              <button type="submit" disabled={pwSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold
                  hover:bg-amber-700 disabled:opacity-50 transition-all duration-200 shadow-sm">
                {pwSaving ? "Saving..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Account Info Card ──────────────────────────────────────────────── */}
      {user && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
            <span className="text-lg">👤</span> Account Information
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Name", value: user.name },
              { label: "Email", value: user.email },
              { label: "Phone", value: user.phone || "Not set" },
              { label: "Role", value: (user.role || "patient").charAt(0).toUpperCase() + (user.role || "patient").slice(1) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Danger Zone ────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-red-600 mb-1 flex items-center gap-2">
          <span className="text-lg">⚠️</span> Danger Zone
        </h2>
        <p className="text-xs text-gray-500 mb-4">Irreversible actions that permanently affect your account.</p>
        <button
          onClick={() => alert("Account deletion would require admin approval. This feature is planned for a future release.")}
          className="px-4 py-2 rounded-xl border border-red-200 text-red-600 text-xs font-bold hover:bg-red-50 transition-all duration-200"
        >
          Request Account Deletion
        </button>
      </div>
    </div>
  );
}
