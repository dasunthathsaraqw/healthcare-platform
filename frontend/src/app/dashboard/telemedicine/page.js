"use client";

import TelemedicineHubCard from "@/components/telemedicine/TelemedicineHubCard";

export default function PatientTelemedicinePage() {
  return (
    <div className="mx-auto max-w-5xl">
      <TelemedicineHubCard
        title="Patient Telemedicine"
        subtitle="Join your online consultation quickly using the appointment ID."
      />
    </div>
  );
}
