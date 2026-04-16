"use client";

import SeverityBadge from "./SeverityBadge";

function ListCard({ title, items, accent = "blue" }) {
  const accentStyles = {
    blue: "text-blue-500",
    purple: "text-purple-500",
    cyan: "text-cyan-500",
    green: "text-green-500",
  };

  const dotColor = accentStyles[accent] || accentStyles.blue;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <h3 className="text-sm font-bold text-gray-900 mb-3">{title}</h3>
      <ul className="space-y-2">
        {(items || []).map((item, idx) => (
          <li key={`${title}-${idx}`} className="text-sm text-gray-600 flex gap-2">
            <span className={`${dotColor} mt-0.5`}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function InsightsStep({ insights, onReset, onBack }) {
  const guidance = Array.isArray(insights?.guidance) ? insights.guidance : [];
  const nextSteps = Array.isArray(insights?.nextSteps) ? insights.nextSteps : guidance;
  const possiblePatterns = Array.isArray(insights?.possiblePatterns)
    ? insights.possiblePatterns
    : [];
  const recommendedSpecialties = Array.isArray(insights?.recommendedSpecialties)
    ? insights.recommendedSpecialties
    : [];

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3 pb-3 border-b border-gray-100">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-blue-500">Final Result</p>
            <h2 className="text-lg font-bold text-gray-900 mt-1">AI Triage Insights</h2>
          </div>
          <SeverityBadge severity={insights?.severity} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ListCard title="Guidance" items={guidance} accent="blue" />
          <ListCard title="Next Steps" items={nextSteps} accent="green" />
        </div>

        <p className="mt-3 text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          {insights?.disclaimer || "This result is not a diagnosis."}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ListCard title="Possible Patterns" items={possiblePatterns} accent="purple" />
        <ListCard
          title="Recommended Specialties"
          items={recommendedSpecialties}
          accent="cyan"
        />
      </div>

      <div className="flex justify-between">
        <button
          onClick={onBack}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Back
        </button>
        <button
          onClick={onReset}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700"
        >
          New check
        </button>
      </div>
    </div>
  );
}
