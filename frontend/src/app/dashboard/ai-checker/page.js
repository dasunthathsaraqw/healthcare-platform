"use client";

import { useRef, useState } from "react";
import StepIndicator from "@/components/ai-checker/StepIndicator";
import DescribeStep from "@/components/ai-checker/DescribeStep";
import RefineStep from "@/components/ai-checker/RefineStep";
import InsightsStep from "@/components/ai-checker/InsightsStep";
import aiCheckerService from "@/services/aiCheckerService";

export default function AICheckerPage() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [symptoms, setSymptoms] = useState("");
  const [includeProfile, setIncludeProfile] = useState(false);
  const [profileData, setProfileData] = useState({
    age: "",
    gender: "",
    history: "",
  });

  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [insights, setInsights] = useState(null);
  const analyzeInFlightRef = useRef(false);
  const insightsInFlightRef = useRef(false);

  const normalizeAiError = (message, fallback) => {
    const text = message || fallback;
    return /429|503|quota|rate limit|too many requests|resource exhausted|temporarily unavailable|service unavailable/i.test(
      text,
    )
      ? "AI service is busy right now. Please wait a bit and try again."
      : text;
  };

  const handleAnalyze = async () => {
    if (analyzeInFlightRef.current) return;
    if (!symptoms.trim()) {
      setError("Please describe your symptoms.");
      return;
    }

    analyzeInFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const res = await aiCheckerService.analyzeSymptoms({
        symptoms,
        includeProfile,
        profileData,
      });

      const q = res?.data?.questions || [];
      setQuestions(Array.isArray(q) ? q : []);
      setStep(2);
    } catch (err) {
      const message = err?.message || "Failed to analyze symptoms.";
      setError(normalizeAiError(message, "Failed to analyze symptoms."));
    } finally {
      analyzeInFlightRef.current = false;
      setLoading(false);
    }
  };

  const handleInsights = async () => {
    if (insightsInFlightRef.current) return;
    if (!questions.length) {
      setError("No follow-up questions available.");
      return;
    }

    insightsInFlightRef.current = true;
    setLoading(true);
    setError("");
    try {
      const formattedAnswers = questions.reduce((acc, q, idx) => {
        acc[`q${idx + 1}`] = {
          question: typeof q === "string" ? q : q?.question || "",
          answer: answers[idx] || "Not sure",
        };
        return acc;
      }, {});

      const res = await aiCheckerService.generateInsights({
        symptoms,
        answers: formattedAnswers,
        includeProfile,
        profileData,
      });

      setInsights(res?.data || null);
      setStep(3);
    } catch (err) {
      const message = err?.message || "Failed to generate insights.";
      setError(normalizeAiError(message, "Failed to generate insights."));
    } finally {
      insightsInFlightRef.current = false;
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setStep(1);
    setError("");
    setQuestions([]);
    setAnswers({});
    setInsights(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-cyan-600 rounded-2xl px-5 sm:px-7 py-6 text-white shadow-lg">
        <p className="text-blue-200 text-xs font-semibold uppercase tracking-widest">Patient Tools</p>
        <h1 className="text-2xl font-extrabold mt-1">AI Checker</h1>
        <p className="text-blue-100 text-sm mt-1">
          Describe symptoms, answer follow-up questions, and get triage-style guidance.
        </p>
      </div>

      <StepIndicator currentStep={step} />

      {error && (
        <div className="bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl px-4 py-3">
          {error}
        </div>
      )}

      {step === 1 && (
        <DescribeStep
          symptoms={symptoms}
          setSymptoms={setSymptoms}
          includeProfile={includeProfile}
          setIncludeProfile={setIncludeProfile}
          profileData={profileData}
          setProfileData={setProfileData}
          onNext={handleAnalyze}
          loading={loading}
        />
      )}

      {step === 2 && (
        <RefineStep
          questions={questions}
          answers={answers}
          setAnswers={setAnswers}
          onBack={() => setStep(1)}
          onNext={handleInsights}
          loading={loading}
        />
      )}

      {step === 3 && (
        <InsightsStep
          insights={insights}
          onBack={() => setStep(2)}
          onReset={resetFlow}
        />
      )}
    </div>
  );
}
