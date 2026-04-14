"use client";
import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";

export default function ReportsPage() {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");

  // Form State
  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("General");
  const [file, setFile] = useState(null);

  const fetchReports = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${process.env.NEXT_PUBLIC_API_URL}/patients/reports`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReports(res.data.reports || []);
    } catch (err) {
      console.error("Failed to load reports", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) {
      setMessage("❌ Please select a file first.");
      return;
    }

    setUploading(true);
    setMessage("Uploading to secure cloud storage...");

    // We MUST use FormData when uploading files!
    const formData = new FormData();
    formData.append("title", title);
    formData.append("documentType", documentType);
    formData.append("document", file); // Must match the multer 'upload.single("document")' name

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/patients/reports`, formData, {
        headers: { 
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data" 
        }
      });
      
      setMessage("✅ Report uploaded successfully!");
      setTitle("");
      setFile(null);
      fetchReports(); // Refresh the list
    } catch (err) {
      setMessage(`❌ Upload failed: ${err.response?.data?.message || err.message}`);
    }
    setUploading(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this report forever?")) return;
    
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${process.env.NEXT_PUBLIC_API_URL}/patients/reports/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchReports(); // Refresh the list
    } catch (err) {
      alert("Failed to delete report.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-4 mt-6">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">My Medical Reports</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* LEFT: Upload Form */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h2 className="text-lg font-semibold mb-4">Upload New Document</h2>
            
            {message && (
              <div className={`mb-4 p-3 rounded text-sm ${message.includes('❌') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
                {message}
              </div>
            )}

            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Report Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required placeholder="e.g., Blood Test 2026" className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={documentType} onChange={(e) => setDocumentType(e.target.value)} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="Blood Test">Blood Test</option>
                  <option value="X-Ray">X-Ray</option>
                  <option value="MRI">MRI</option>
                  <option value="Prescription">Prescription</option>
                  <option value="General">General/Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Select File (PDF/Image)</label>
                <input type="file" onChange={handleFileChange} accept=".pdf,.jpg,.jpeg,.png" required className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
              </div>

              <button type="submit" disabled={uploading} className="w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition disabled:opacity-50">
                {uploading ? "Uploading..." : "Secure Upload"}
              </button>
            </form>
          </div>
        </div>

        {/* RIGHT: Document Library */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 min-h-[400px]">
            <h2 className="text-lg font-semibold mb-4">Document Library</h2>
            
            {loading ? (
              <p className="text-gray-500">Loading documents...</p>
            ) : reports.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                <span className="text-4xl block mb-2">📄</span>
                <p className="text-gray-500">No medical reports found.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => (
                  <div key={report._id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:shadow-md transition">
                    <div>
                      <h3 className="font-semibold text-gray-800">{report.title}</h3>
                      <p className="text-xs text-gray-500">
                        {report.documentType} • Uploaded {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <a href={report.fileUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-green-100 text-green-700 rounded hover:bg-green-200 text-sm font-medium">
                        View File
                      </a>
                      <button onClick={() => handleDelete(report._id)} className="px-3 py-1.5 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium">
                        Delete
                      </button>
                    </div>
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