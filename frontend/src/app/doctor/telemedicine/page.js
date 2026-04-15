"use client";

import { Suspense } from "react";
import TelemedicineHubCard from "@/components/telemedicine/TelemedicineHubCard";

export default function DoctorTelemedicinePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Loading telemedicine...</div>}>
        <TelemedicineHubCard
          title="Doctor Telemedicine"
          subtitle="Start or continue video consultations for your scheduled appointments."
        />
      </Suspense>
    </div>
  );
}
