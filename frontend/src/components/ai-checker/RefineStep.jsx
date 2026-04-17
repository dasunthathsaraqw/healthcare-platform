"use client";

import { useEffect, useMemo, useState } from "react";

const DEFAULT_OPTIONS = [
  "Not at all",
  "Mild",
  "Moderate",
  "Severe",
  "Not sure",
];

export default function RefineStep({
  questions,
  answers,
  setAnswers,
  onBack,
  onNext,
  loading,
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [localAnswers, setLocalAnswers] = useState(answers || {});

  useEffect(() => {
    setLocalAnswers(answers || {});
  }, [answers]);

  useEffect(() => {
    setAnswers(localAnswers);
  }, [localAnswers, setAnswers]);

  const totalQuestions = questions.length;
  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === totalQuestions - 1;

  const questionText = useMemo(() => {
    if (typeof currentQuestion === "string") return currentQuestion;
    if (currentQuestion && typeof currentQuestion.question === "string") {
      return currentQuestion.question;
    }
    return "";
  }, [currentQuestion]);

  const options = useMemo(() => {
    if (
      currentQuestion &&
      typeof currentQuestion === "object" &&
      Array.isArray(currentQuestion.options) &&
      currentQuestion.options.length
    ) {
      return currentQuestion.options;
    }
    return DEFAULT_OPTIONS;
  }, [currentQuestion]);

  const selected = localAnswers[currentIndex] || "";

  const handleSelect = (option) => {
    setLocalAnswers((prev) => ({
      ...prev,
      [currentIndex]: option,
    }));
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      return;
    }
    onBack();
  };

  const handleNext = () => {
    if (!selected) return;
    if (!isLastQuestion) {
      setCurrentIndex((prev) => prev + 1);
      return;
    }
    onNext();
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 sm:p-6 space-y-4">
      <h2 className="text-lg font-bold text-gray-900">Refine Details</h2>
      <p className="text-sm text-gray-500">Answer a few follow-up questions.</p>

      {totalQuestions > 0 ? (
        <>
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-2">
              Question {currentIndex + 1} of {totalQuestions}
            </p>
            <p className="text-base font-semibold text-gray-800">{questionText}</p>
          </div>

          <div className="space-y-2">
            {options.map((option) => {
              const active = selected === option;
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className={`w-full text-left px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                    active
                      ? "bg-blue-50 border-blue-300 text-blue-700"
                      : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {option}
                </button>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-700">
          No follow-up questions found. Please go back and try again.
        </div>
      )}

      <div className="flex justify-between">
        <button
          onClick={handlePrevious}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50"
        >
          Previous
        </button>
        <button
          onClick={handleNext}
          disabled={loading || !selected || totalQuestions === 0}
          className="px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Generating..." : isLastQuestion ? "Get insights" : "Next"}
        </button>
      </div>
    </div>
  );
}
