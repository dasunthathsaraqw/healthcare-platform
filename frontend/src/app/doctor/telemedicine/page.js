"use client";

import TelemedicineHubCard from "@/components/telemedicine/TelemedicineHubCard";

export default function DoctorTelemedicinePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <TelemedicineHubCard
        title="Doctor Telemedicine"
        subtitle="Start or continue video consultations for your scheduled appointments."
      />
    </div>
  );
}
