"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import { jsPDF } from "jspdf";

const rawApiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";
const normalizedApiBase = rawApiBase.replace(/\/+$/, "");
const API_BASE = /\/api$/i.test(normalizedApiBase) ? normalizedApiBase : `${normalizedApiBase}/api`;

function authHeaders() {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  return { Authorization: `Bearer ${token}` };
}

export default function PatientPrescriptionsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const downloadAsPdf = (rx) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;

    const issuedDate = new Date(rx.issuedAt || rx.createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const safeDiagnosis = (rx.diagnosis || "Prescription").replace(/[^\w\s-]/g, "").trim() || "Prescription";

    doc.setFontSize(18);
    doc.text("Prescription", 14, y);
    y += 8;

    doc.setFontSize(11);
    doc.setTextColor(80);
    doc.text(`Issued on: ${issuedDate}`, 14, y);
    y += 10;

    doc.setTextColor(20);
    doc.setFontSize(12);
    doc.text("Diagnosis:", 14, y);
    y += 6;
    const diagnosisLines = doc.splitTextToSize(rx.diagnosis || "-", pageWidth - 28);
    doc.text(diagnosisLines, 14, y);
    y += diagnosisLines.length * 6 + 4;

    doc.setFontSize(12);
    doc.text("Medications:", 14, y);
    y += 7;

    const meds = rx.medications || [];
    if (meds.length === 0) {
      doc.setFontSize(11);
      doc.text("No medications listed.", 16, y);
      y += 8;
    } else {
      meds.forEach((m, idx) => {
        const line = `${idx + 1}. ${m.name || "-"} | ${m.dosage || "-"} | ${m.frequency || "-"} | ${m.duration || "-"} | ${m.instructions || "-"}`;
        const lines = doc.splitTextToSize(line, pageWidth - 30);
        doc.setFontSize(10);
        doc.text(lines, 16, y);
        y += lines.length * 5 + 2;
        if (y > 270) {
          doc.addPage();
          y = 18;
        }
      });
    }

    y += 3;
    doc.setFontSize(12);
    doc.text("Notes:", 14, y);
    y += 6;
    const notesLines = doc.splitTextToSize(rx.notes || "-", pageWidth - 28);
    doc.setFontSize(11);
    doc.text(notesLines, 14, y);

    doc.save(`${safeDiagnosis}-prescription.pdf`);
  };

  useEffect(() => {
    const loadPrescriptions = async () => {
      setLoading(true);
      setError("");
      try {
        const rawUser = localStorage.getItem("user");
        const user = rawUser ? JSON.parse(rawUser) : null;
        const patientId = user?.userId || user?.id || user?._id;
        if (!patientId) throw new Error("Patient identity not found.");

        const res = await axios.get(
          `${API_BASE}/doctors/prescriptions/patient/${patientId}`,
          { headers: authHeaders() }
        );
        setItems(res.data?.prescriptions || []);
      } catch (err) {
        setError(err?.response?.data?.message || err.message || "Failed to load prescriptions.");
      } finally {
        setLoading(false);
      }
    };

    loadPrescriptions();
  }, []);

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My Prescriptions</h1>
        <p className="text-sm text-gray-500 mt-1">Prescriptions issued by your doctors.</p>
      </div>

      {loading && (
        <div className="bg-white border border-gray-100 rounded-xl p-6">
          <p className="text-sm text-gray-500">Loading prescriptions...</p>
        </div>
      )}

      {!loading && error && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {!loading && !error && items.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-xl p-8 text-center">
          <p className="text-sm font-semibold text-gray-700">No prescriptions yet</p>
          <p className="text-xs text-gray-400 mt-1">Issued prescriptions will appear here.</p>
        </div>
      )}

      {!loading && !error && items.length > 0 && (
        <div className="space-y-3">
          {items.map((rx) => (
            <div key={rx._id} className="bg-white border border-gray-100 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-gray-900 truncate">{rx.diagnosis || "Prescription"}</p>
                <span className="text-[11px] text-gray-400 shrink-0">
                  {new Date(rx.issuedAt || rx.createdAt).toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {(rx.medications || []).length} medication{(rx.medications || []).length !== 1 ? "s" : ""}
              </p>
              {rx.notes && <p className="text-xs text-gray-600 mt-2">{rx.notes}</p>}
              <div className="mt-3">
                <button
                  onClick={() => downloadAsPdf(rx)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors"
                >
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
