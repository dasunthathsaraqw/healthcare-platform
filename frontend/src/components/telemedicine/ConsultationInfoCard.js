"use client";

const statusClasses = {
  CREATED: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-emerald-100 text-emerald-700",
  ENDED: "bg-slate-200 text-slate-700",
  CANCELLED: "bg-rose-100 text-rose-700",
};

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default function ConsultationInfoCard({ session }) {
  const status = session?.status || "CREATED";
  const badgeClass = statusClasses[status] || "bg-blue-100 text-blue-700";

  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Consultation Info</h2>

      <div className="mt-5 space-y-3 text-sm text-slate-700">
        <InfoRow label="Appointment ID" value={session?.appointmentId} />
        <InfoRow label="Doctor" value={session?.doctorName || session?.doctorId} />
        <InfoRow label="Patient" value={session?.patientName || session?.patientId} />
        <InfoRow label="Scheduled Time" value={formatDateTime(session?.scheduledAt)} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-slate-500">Session Status</span>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${badgeClass}`}>
            {status}
          </span>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900 break-all">{value || "-"}</span>
    </div>
  );
}
