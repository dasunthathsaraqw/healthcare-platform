"use client";

import { useEffect, useState } from "react";
import jsPDF from "jspdf";
import api from "@/services/api";

function addWrappedText(doc, text, x, y, maxWidth, lineHeight = 6) {
  const lines = doc.splitTextToSize(text || "None", maxWidth);
  lines.forEach((line) => {
    doc.text(line, x, y);
    y += lineHeight;
  });
  return y;
}

function addSectionTitle(doc, title, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text(title, 14, y);
  doc.setDrawColor(226, 232, 240);
  doc.line(14, y + 2, 196, y + 2);
  return y + 10;
}

function ensurePage(doc, y, minSpace = 20) {
  if (y <= 277 - minSpace) return y;
  doc.addPage();
  return 20;
}

export default function PrivacyPage() {
  const [user, setUser] = useState(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [downloadingJson, setDownloadingJson] = useState(false);
  const [downloaded, setDownloaded] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch {}
  }, []);

  const downloadBlob = (blob, filename) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const fetchExportData = async () => {
    const res = await api.get("/patients/export");
    return res.data;
  };

  const generatePdf = (payload) => {
    const doc = new jsPDF();
    const profile = payload.user || {};
    const reports = payload.reports || [];
    const metrics = payload.metrics || [];
    const medicalHistory = profile.medicalHistory || [];

    let y = 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Patient Data Export", 14, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on ${new Date(payload.exportDate || Date.now()).toLocaleString()}`, 14, y);
    y += 12;
    doc.setTextColor(17, 24, 39);

    y = addSectionTitle(doc, "Profile", y);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    [
      `Name: ${profile.name || "N/A"}`,
      `Email: ${profile.email || "N/A"}`,
      `Phone: ${profile.phone || "Not set"}`,
      `Role: ${profile.role || "patient"}`,
      `Address: ${profile.address || "Not set"}`,
      `Date of Birth: ${profile.dateOfBirth ? new Date(profile.dateOfBirth).toLocaleDateString() : "Not set"}`,
    ].forEach((line) => {
      y = ensurePage(doc, y);
      doc.text(line, 14, y);
      y += 7;
    });

    y = ensurePage(doc, y, 35);
    y = addSectionTitle(doc, "Medical History", y);
    if (medicalHistory.length === 0) {
      doc.setFont("helvetica", "normal");
      doc.text("No medical history entries recorded.", 14, y);
      y += 8;
    } else {
      medicalHistory.forEach((item) => {
        y = ensurePage(doc, y);
        doc.text(`• ${item}`, 16, y);
        y += 7;
      });
    }

    y = ensurePage(doc, y, 40);
    y = addSectionTitle(doc, "Medical Reports", y);
    if (reports.length === 0) {
      doc.text("No uploaded reports found.", 14, y);
      y += 8;
    } else {
      reports.forEach((report, index) => {
        y = ensurePage(doc, y, 30);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${report.title || "Untitled Report"}`, 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        y = addWrappedText(
          doc,
          `Type: ${report.documentType || "General"} | Uploaded: ${report.createdAt ? new Date(report.createdAt).toLocaleString() : "Unknown"}`,
          16,
          y,
          176,
          5
        );
        y = addWrappedText(doc, `File URL: ${report.fileUrl || "Unavailable"}`, 16, y, 176, 5);
        y += 3;
      });
    }

    y = ensurePage(doc, y, 40);
    y = addSectionTitle(doc, "Health Metrics", y);
    if (metrics.length === 0) {
      doc.text("No health metrics found.", 14, y);
    } else {
      metrics.forEach((metric, index) => {
        y = ensurePage(doc, y, 24);
        doc.setFont("helvetica", "bold");
        doc.text(`${index + 1}. ${metric.metricType || "Metric"}`, 14, y);
        y += 6;
        doc.setFont("helvetica", "normal");
        y = addWrappedText(
          doc,
          `Value: ${metric.value ?? "N/A"} ${metric.unit || ""} | Recorded: ${metric.recordedAt ? new Date(metric.recordedAt).toLocaleString() : "Unknown"}`,
          16,
          y,
          176,
          5
        );
        if (metric.notes) {
          y = addWrappedText(doc, `Notes: ${metric.notes}`, 16, y, 176, 5);
        }
        y += 3;
      });
    }

    doc.save(`patient-data-export-${Date.now()}.pdf`);
  };

  const handleExportPdf = async () => {
    setDownloadingPdf(true);
    try {
      const exportData = await fetchExportData();
      generatePdf(exportData);
      setDownloaded(true);
      setTimeout(() => setDownloaded(false), 5000);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export data as PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleExportJson = async () => {
    setDownloadingJson(true);
    try {
      const exportData = await fetchExportData();
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
      downloadBlob(blob, `patient-data-export-${Date.now()}.json`);
    } catch (err) {
      alert(err.response?.data?.message || "Failed to export JSON data. Please try again.");
    } finally {
      setDownloadingJson(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwError("");
    setPwSuccess("");

    if (!currentPw || !newPw || !confirmPw) {
      setPwError("All fields are required.");
      return;
    }
    if (newPw.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwSaving(true);
    try {
      await api.put("/auth/change-password", {
        currentPassword: currentPw,
        newPassword: newPw,
      });

      setPwSuccess("Password changed successfully!");
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setTimeout(() => setPwSuccess(""), 4000);
    } catch (err) {
      setPwError(err.response?.data?.message || "Failed to change password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Data Export & Privacy</h1>
        <p className="text-sm text-gray-500 mt-1">Download your data, manage your security settings, and control your account.</p>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-2xl shrink-0">
            PDF
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Download My Data</h2>
            <p className="text-xs text-gray-500 mt-1 leading-relaxed">
              Export your profile, medical history, uploaded reports, and health metrics as a readable PDF.
              A raw JSON export is also available if you need the machine-readable version.
            </p>

            <div className="mt-4 flex items-center gap-3 flex-wrap">
              <button
                onClick={handleExportPdf}
                disabled={downloadingPdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                {downloadingPdf ? "Preparing PDF..." : "Download PDF"}
              </button>
              <button
                onClick={handleExportJson}
                disabled={downloadingJson}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-50 disabled:opacity-50 transition-all duration-200"
              >
                {downloadingJson ? "Preparing JSON..." : "Download JSON"}
              </button>
              {downloaded && <span className="text-xs text-green-600 font-semibold">Export downloaded successfully.</span>}
            </div>

            <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-200">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-2">What&apos;s included in your export</p>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <span>Personal profile</span>
                <span>Medical history</span>
                <span>Uploaded reports</span>
                <span>Health metrics</span>
                <span>Account metadata</span>
                <span>Portable PDF + JSON</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl shrink-0">
            Key
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900">Change Password</h2>
            <p className="text-xs text-gray-500 mt-1">Update your account password. You will need your current password to proceed.</p>

            <form onSubmit={handlePasswordChange} className="mt-4 space-y-3 max-w-sm">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Current Password</label>
                <input
                  type="password"
                  value={currentPw}
                  onChange={(e) => setCurrentPw(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">New Password</label>
                <input
                  type="password"
                  value={newPw}
                  onChange={(e) => setNewPw(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPw}
                  onChange={(e) => setConfirmPw(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all duration-200"
                />
              </div>

              {pwError && <p className="text-xs text-red-500 font-medium">{pwError}</p>}
              {pwSuccess && <p className="text-xs text-green-600 font-medium">{pwSuccess}</p>}

              <button
                type="submit"
                disabled={pwSaving}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-600 text-white text-sm font-bold hover:bg-amber-700 disabled:opacity-50 transition-all duration-200 shadow-sm"
              >
                {pwSaving ? "Saving..." : "Update Password"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {user && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Account Information</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: "Name", value: user.name },
              { label: "Email", value: user.email },
              { label: "Phone", value: user.phone || "Not set" },
              { label: "Role", value: `${(user.role || "patient").charAt(0).toUpperCase()}${(user.role || "patient").slice(1)}` },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{label}</p>
                <p className="text-sm font-medium text-gray-900 mt-0.5 truncate">{value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-6">
        <h2 className="text-sm font-bold text-red-600 mb-1">Danger Zone</h2>
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
