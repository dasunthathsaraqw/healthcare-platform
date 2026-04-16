"use client";

const severityStyles = {
  Low: {
    wrap: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  Medium: {
    wrap: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-500",
  },
  High: {
    wrap: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
};

export default function SeverityBadge({ severity = "Low" }) {
  const style = severityStyles[severity] || {
    wrap: "bg-gray-50 text-gray-700 border-gray-200",
    dot: "bg-gray-400",
  };

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-extrabold border ${style.wrap}`}
    >
      <span className={`w-2 h-2 rounded-full ${style.dot}`} />
      <span>Severity: {severity}</span>
    </span>
  );
}
