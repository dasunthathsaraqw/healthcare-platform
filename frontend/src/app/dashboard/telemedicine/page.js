"use client";

import { Suspense } from "react";
import TelemedicineHubCard from "@/components/telemedicine/TelemedicineHubCard";

export default function PatientTelemedicinePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading telemedicine...</div>}>
        <TelemedicineHubCard
          title="Patient Telemedicine"
          subtitle="Join your scheduled online consultations and continue ongoing sessions."
          allowManualEntry={false}
        />
      </Suspense>
    </div>
  );
}
