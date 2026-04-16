"use client";

const steps = ["Describe", "Refine", "Insights"];

export default function StepIndicator({ currentStep }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 sm:gap-4">
        {steps.map((step, idx) => {
          const stepNumber = idx + 1;
          const isActive = stepNumber === currentStep;
          const isDone = stepNumber < currentStep;

          return (
            <div key={step} className="flex items-center flex-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                    isDone
                      ? "bg-green-500 text-white"
                      : isActive
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {isDone ? "✓" : stepNumber}
                </div>
                <span
                  className={`text-xs sm:text-sm font-semibold truncate ${
                    isActive ? "text-blue-700" : "text-gray-500"
                  }`}
                >
                  {step}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className="mx-2 sm:mx-4 h-px flex-1 bg-gray-200" />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
