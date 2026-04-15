"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import toast, { Toaster } from "react-hot-toast";

// ─── Skeleton Components ──────────────────────────────────────────────────────

function UploadFormSkeleton() {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 animate-pulse">
      <div className="h-5 w-40 bg-gray-200 rounded mb-5" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="mb-4">
          <div className="h-3 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-10 w-full bg-gray-100 rounded-lg" />
        </div>
      ))}
      <div className="h-10 w-full bg-gray-200 rounded-lg mt-2" />
    </div>
  );
}

function ReportCardSkeleton() {
  return (
    <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-200 rounded-xl shrink-0" />
        <div>
          <div className="h-4 w-40 bg-gray-200 rounded mb-2" />
          <div className="h-3 w-28 bg-gray-100 rounded" />
        </div>
      </div>
      <div className="flex gap-2">
        <div className="h-8 w-16 bg-gray-100 rounded" />
        <div className="h-8 w-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}

// ─── Upload Progress Bar ──────────────────────────────────────────────────────

function UploadProgress({ progress }) {
  if (progress === null) return null;
  return (
    <div className="mt-3">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>Uploading to secure cloud…</span>
        <span>{progress}%</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
        <div
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

// ─── Document Type Icons ──────────────────────────────────────────────────────

const DOC_ICONS = {
  "Blood Test": "🩸",
  "X-Ray":      "🦴",
  "MRI":        "🧠",
  "Prescription": "💊",
  "General":    "📄",
};

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PAGE
// ─────────────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { user } = useAuth();

  const [reports, setReports]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [uploading, setUploading]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState(null);
  const [deletingId, setDeletingId]     = useState(null);

  // Form state
  const [title, setTitle]               = useState("");
  const [titleError, setTitleError]     = useState("");
  const [documentType, setDocumentType] = useState("General");
  const [file, setFile]                 = useState(null);
  const [fileError, setFileError]       = useState("");
  const fileInputRef = useRef(null);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/reports`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReports(res.data.reports || []);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReports(); }, []);

  // ── File selection & validation ───────────────────────────────────────────────
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    setFileError("");

    if (!selected) { setFile(null); return; }

    const ALLOWED = ["application/pdf", "image/jpeg", "image/png", "image/jpg"];
    if (!ALLOWED.includes(selected.type)) {
      setFileError("Only PDF, JPG, and PNG files are allowed.");
      setFile(null);
      e.target.value = "";
      return;
    }

    const MAX_MB = 5;
    if (selected.size > MAX_MB * 1024 * 1024) {
      setFileError(`File size must be under ${MAX_MB} MB.`);
      setFile(null);
      e.target.value = "";
      return;
    }

    setFile(selected);
  };

  // ── Upload ────────────────────────────────────────────────────────────────────
  const handleUpload = async (e) => {
    e.preventDefault();

    let valid = true;
    if (!title.trim()) { setTitleError("Report title is required."); valid = false; }
    else if (title.trim().length > 200) { setTitleError("Title is too long (max 200 characters)."); valid = false; }

    if (!file) { setFileError("Please select a file to upload."); valid = false; }

    if (!valid) {
      toast.error("Please fix the form errors before uploading.");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("documentType", documentType);
    formData.append("document", file);

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/patients/reports`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (e) => {
            const pct = Math.round((e.loaded * 100) / e.total);
            setUploadProgress(pct);
          },
        }
      );

      toast.success("Report uploaded successfully! 📄", { duration: 4000 });
      setTitle("");
      setFile(null);
      setTitleError("");
      setFileError("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      fetchReports();
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      toast.error(`Upload failed: ${msg}`);
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────────
  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this report?")) return;
    setDeletingId(id);
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/patients/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("Report deleted successfully.");
      setReports((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      toast.error("Failed to delete report. Please try again.");
    } finally {
      setDeletingId(null);
    }
  };

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
        }}
      />

      <div className="max-w-6xl mx-auto p-4 mt-6">
        <h1 className="text-2xl font-bold mb-6 text-gray-800">My Medical Reports</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

          {/* ── LEFT: Upload Form ──────────────────────────────────────────── */}
          <div className="md:col-span-1">
            {loading ? (
              <UploadFormSkeleton />
            ) : (
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                <h2 className="text-base font-bold text-gray-800 mb-5">Upload New Document</h2>

                <form onSubmit={handleUpload} className="space-y-4" noValidate>
                  {/* Title */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Report Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => { setTitle(e.target.value); setTitleError(""); }}
                      placeholder="e.g., Blood Test — April 2026"
                      className={`w-full p-2.5 border rounded-lg text-sm focus:ring-2 outline-none transition-all ${
                        titleError
                          ? "border-red-400 bg-red-50 focus:ring-red-400"
                          : "border-gray-200 focus:ring-blue-500 bg-gray-50 focus:bg-white"
                      }`}
                    />
                    {titleError && (
                      <p className="mt-1 text-xs text-red-500">{titleError}</p>
                    )}
                  </div>

                  {/* Document type */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      Document Type
                    </label>
                    <select
                      value={documentType}
                      onChange={(e) => setDocumentType(e.target.value)}
                      className="w-full p-2.5 border border-gray-200 bg-gray-50 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none transition-all"
                    >
                      {Object.keys(DOC_ICONS).map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  {/* File picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">
                      File <span className="text-red-400">*</span>
                      <span className="normal-case font-normal text-gray-400 ml-1">(PDF / JPG / PNG, max 5 MB)</span>
                    </label>
                    <input
                      type="file"
                      onChange={handleFileChange}
                      accept=".pdf,.jpg,.jpeg,.png"
                      ref={fileInputRef}
                      className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition cursor-pointer"
                    />
                    {file && !fileError && (
                      <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
                        ✅ {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                      </p>
                    )}
                    {fileError && (
                      <p className="mt-1 text-xs text-red-500">{fileError}</p>
                    )}
                  </div>

                  {/* Progress bar */}
                  <UploadProgress progress={uploadProgress} />

                  <button
                    type="submit"
                    disabled={uploading}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-semibold py-2.5 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                  >
                    {uploading ? (
                      <>
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Uploading…
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Secure Upload
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* ── RIGHT: Document Library ────────────────────────────────────── */}
          <div className="md:col-span-2">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-gray-800">Document Library</h2>
                {!loading && reports.length > 0 && (
                  <span className="text-xs text-gray-400 font-medium">{reports.length} document{reports.length !== 1 ? "s" : ""}</span>
                )}
              </div>

              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => <ReportCardSkeleton key={i} />)}
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-16 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                  <span className="text-5xl block mb-3">📂</span>
                  <p className="font-semibold text-gray-600 mb-1">No medical reports yet</p>
                  <p className="text-sm text-gray-400">Upload your first document using the form on the left.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => {
                    const isDeleting = deletingId === report._id;
                    return (
                      <div
                        key={report._id}
                        className={`flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-xl hover:shadow-md transition-all group ${isDeleting ? "opacity-50" : ""}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-blue-50 border border-blue-100 rounded-xl flex items-center justify-center text-xl shrink-0">
                            {DOC_ICONS[report.documentType] || "📄"}
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-semibold text-gray-800 text-sm truncate">{report.title}</h3>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {report.documentType} · {new Date(report.createdAt).toLocaleDateString("en-US", {
                                day: "numeric", month: "short", year: "numeric"
                              })}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2 shrink-0 ml-3">
                          <a
                            href={report.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1.5 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 text-xs font-semibold transition-colors"
                          >
                            View
                          </a>
                          <button
                            onClick={() => handleDelete(report._id)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 text-xs font-semibold transition-colors disabled:opacity-50"
                          >
                            {isDeleting ? "…" : "Delete"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}