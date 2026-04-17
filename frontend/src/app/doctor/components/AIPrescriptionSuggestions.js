"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";

const AI_API_BASE = process.env.NEXT_PUBLIC_AI_CHECKER_URL || "http://localhost:3009/api/ai-checker";

function AIPrescriptionSuggestions({
    isOpen,
    onClose,
    patient,
    currentPrescriptionData,
    onSuggestionApply
}) {
    const [loading, setLoading] = useState(false);
    const [suggestions, setSuggestions] = useState(null);
    const [error, setError] = useState(null);
    const [displayedText, setDisplayedText] = useState({});
    const [typingComplete, setTypingComplete] = useState(false);
    const [thinkingSteps, setThinkingSteps] = useState([]);
    const [currentThinkingStep, setCurrentThinkingStep] = useState(0);
    const typingTimeouts = useRef([]);
    const hasFetched = useRef(false);

    // Thinking messages to display while loading
    const thinkingMessages = [
        { icon: "🔍", text: "Analyzing patient medical history..." },
        { icon: "📋", text: "Reviewing past appointment information..." },
        { icon: "💊", text: "Checking previous prescriptions..." },
        { icon: "🧠", text: "Identifying potential health patterns..." },
        { icon: "📊", text: "Cross-referencing with medical guidelines..." },
        { icon: "✨", text: "Generating personalized suggestions..." },
    ];

    // Auto-fetch when modal opens
    useEffect(() => {
        if (isOpen && !hasFetched.current && patient) {
            hasFetched.current = true;
            fetchSuggestions();
        }

        // Reset fetch flag when modal closes
        if (!isOpen) {
            hasFetched.current = false;
            setSuggestions(null);
            setError(null);
            setThinkingSteps([]);
            setCurrentThinkingStep(0);
        }
    }, [isOpen, patient]);

    // Animate thinking steps
    useEffect(() => {
        if (loading && currentThinkingStep < thinkingMessages.length) {
            const timer = setTimeout(() => {
                setThinkingSteps(prev => [...prev, thinkingMessages[currentThinkingStep]]);
                setCurrentThinkingStep(prev => prev + 1);
            }, 2000); // Change message every 2 seconds
            return () => clearTimeout(timer);
        }
    }, [loading, currentThinkingStep, thinkingMessages]);

    // Typing animation effect
    useEffect(() => {
        if (!suggestions) return;

        typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
        typingTimeouts.current = [];
        setDisplayedText({});
        setTypingComplete(false);

        const typeText = (section, text, index = 0) => {
            if (index <= text.length) {
                setDisplayedText(prev => ({
                    ...prev,
                    [section]: text.slice(0, index)
                }));
                const timeout = setTimeout(() => typeText(section, text, index + 1), 15);
                typingTimeouts.current.push(timeout);
            }
        };

        if (suggestions.healthAnalysis?.summary) {
            typeText("healthAnalysis_summary", suggestions.healthAnalysis.summary);
        }
        if (suggestions.disclaimer) {
            setTimeout(() => {
                typeText("disclaimer", suggestions.disclaimer);
            }, 500);
        }

        const totalLength = (suggestions.healthAnalysis?.summary?.length || 0) +
            (suggestions.disclaimer?.length || 0);
        const timeout = setTimeout(() => setTypingComplete(true), totalLength * 15 + 1000);
        typingTimeouts.current.push(timeout);

        return () => {
            typingTimeouts.current.forEach(timeout => clearTimeout(timeout));
        };
    }, [suggestions]);

    const fetchSuggestions = async () => {
        setLoading(true);
        setError(null);
        setSuggestions(null);
        setThinkingSteps([]);
        setCurrentThinkingStep(0);

        // Prepare patient data
        const patientData = {
            name: patient?.name || "Unknown",
            age: patient?.age || patient?.dateOfBirth ? calculateAge(patient.dateOfBirth) : null,
            gender: patient?.gender || "Not specified",
            bloodGroup: patient?.bloodGroup || null,
            allergies: patient?.allergies || [],
            chronicConditions: patient?.chronicConditions || [],
            notes: patient?.medicalNotes || null,
        };

        const appointmentData = {
            date: currentPrescriptionData?.appointmentDate || null,
            type: currentPrescriptionData?.appointmentType || null,
            vitals: currentPrescriptionData?.vitals || null,
            chiefComplaint: currentPrescriptionData?.chiefComplaint || null,
        };

        try {
            const response = await axios.post(
                `${AI_API_BASE}/prescription/suggestions`,
                {
                    patientData,
                    appointmentData,
                    prescriptionData: {
                        diagnosis: currentPrescriptionData?.diagnosis || "",
                        medications: currentPrescriptionData?.medications || [],
                        notes: currentPrescriptionData?.notes || "",
                    },
                    previousPrescriptions: patient?.previousPrescriptions || [],
                    previousDiagnosis: patient?.previousDiagnosis || [],
                },
                {
                    headers: { "Content-Type": "application/json" },
                    timeout: 60000,
                }
            );

            if (response.data.success) {
                setSuggestions(response.data.data);
            } else {
                setError(response.data.message || "Failed to get suggestions");
            }
        } catch (err) {
            console.error("AI suggestion error:", err);
            setError(err.response?.data?.message || err.message || "Failed to connect to AI service");
        } finally {
            setLoading(false);
        }
    };

    const calculateAge = (dob) => {
        if (!dob) return null;
        const birthDate = new Date(dob);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    };

    const applyMedicationSuggestion = (medSuggestion) => {
        onSuggestionApply({
            type: "medication",
            data: {
                name: medSuggestion.name,
                dosage: medSuggestion.dosage,
                frequency: medSuggestion.frequency,
                duration: medSuggestion.duration,
                instructions: medSuggestion.reasoning,
            },
        });
    };

    const applyDiagnosisSuggestion = (condition) => {
        onSuggestionApply({
            type: "diagnosis",
            data: condition,
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-20 bottom-20 w-96 bg-white shadow-2xl rounded-l-2xl z-50 flex flex-col border-l border-gray-200 animate-slideIn">
            {/* Header - unchanged */}
            <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-tl-2xl">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                        <svg className="w-4 h-4 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-gray-900">AI Clinical Assistant</h3>
                        <p className="text-[10px] text-gray-500">Analyzing patient data...</p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Loading state with thinking animation */}
                {loading && (
                    <div className="flex flex-col items-start justify-center space-y-3">
                        {/* Animated brain icon */}
                        <div className="flex items-center gap-3 w-full">
                            <div className="relative">
                                <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                                    <div className="w-6 h-6 border-2 border-indigo-400 border-t-indigo-600 rounded-full animate-spin" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-indigo-600">AI is thinking...</p>
                                <p className="text-xs text-gray-400">Analyzing patient data in real-time</p>
                            </div>
                        </div>

                        {/* Thinking steps with typewriter effect */}
                        <div className="w-full mt-4 space-y-2">
                            {thinkingSteps.map((step, idx) => (
                                <div
                                    key={idx}
                                    className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg animate-fadeIn"
                                >
                                    <span className="text-base">{step.icon}</span>
                                    <p className="text-xs text-gray-600">{step.text}</p>
                                    {idx === thinkingSteps.length - 1 && (
                                        <div className="flex gap-0.5 ml-auto">
                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <span className="w-1 h-1 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Typing indicator for current step */}
                            {currentThinkingStep < thinkingMessages.length && (
                                <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                                    <span className="text-base">{thinkingMessages[currentThinkingStep]?.icon}</span>
                                    <p className="text-xs text-indigo-600 font-medium">
                                        {thinkingMessages[currentThinkingStep]?.text}
                                        <span className="inline-flex ml-1">
                                            <span className="animate-pulse">.</span>
                                            <span className="animate-pulse animation-delay-200">.</span>
                                            <span className="animate-pulse animation-delay-400">.</span>
                                        </span>
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Error state - unchanged */}
                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-semibold text-red-700">Error</p>
                        </div>
                        <p className="text-xs text-red-600">{error}</p>
                        <button
                            onClick={fetchSuggestions}
                            className="mt-3 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold rounded-lg transition-colors"
                        >
                            Try Again
                        </button>
                    </div>
                )}

                {/* Suggestions display - rest of your existing code remains the same */}
                {suggestions && (
                    // ... keep your existing suggestions display code here ...
                    <div className="space-y-4">
                        {/* Health Analysis Section */}
                        {suggestions.healthAnalysis && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 border border-blue-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                                        <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wide">Health Analysis</h4>
                                </div>

                                <p className="text-sm text-gray-700 leading-relaxed">
                                    {displayedText.healthAnalysis_summary || (typingComplete ? suggestions.healthAnalysis.summary : "▊")}
                                </p>

                                {suggestions.healthAnalysis.keyFindings?.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[10px] font-semibold text-blue-600 mb-1.5">🔍 Key Findings</p>
                                        <ul className="space-y-1">
                                            {suggestions.healthAnalysis.keyFindings.map((finding, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                                    <span className="text-blue-400">•</span>
                                                    {finding}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {suggestions.healthAnalysis.riskFactors?.length > 0 && (
                                    <div className="mt-3">
                                        <p className="text-[10px] font-semibold text-amber-600 mb-1.5">⚠️ Risk Factors</p>
                                        <ul className="space-y-1">
                                            {suggestions.healthAnalysis.riskFactors.map((risk, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                                    <span className="text-amber-400">•</span>
                                                    {risk}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {suggestions.healthAnalysis.recommendedActions?.length > 0 && (
                                    <div className="mt-3 pt-2 border-t border-blue-100">
                                        <p className="text-[10px] font-semibold text-green-600 mb-1.5">✅ Recommended Actions</p>
                                        <ul className="space-y-1">
                                            {suggestions.healthAnalysis.recommendedActions.map((action, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                                    <span className="text-green-400">•</span>
                                                    {action}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Medication Suggestions */}
                        {suggestions.medicationSuggestions?.length > 0 && (
                            <div className="bg-white rounded-xl border border-green-100 overflow-hidden">
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2 border-b border-green-100">
                                    <div className="flex items-center gap-2">
                                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <h4 className="text-xs font-bold text-green-700 uppercase tracking-wide">Suggested Medications</h4>
                                    </div>
                                </div>
                                <div className="p-3 space-y-3">
                                    {suggestions.medicationSuggestions.map((med, idx) => (
                                        <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                                            <div className="flex items-start justify-between mb-2">
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800">{med.name}</p>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{med.dosage}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">{med.frequency}</span>
                                                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{med.duration}</span>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => applyMedicationSuggestion(med)}
                                                    className="px-2 py-1 text-[10px] font-semibold text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                                                >
                                                    + Add
                                                </button>
                                            </div>
                                            <p className="text-xs text-gray-500 mt-2">{med.reasoning}</p>
                                            {med.alternatives?.length > 0 && (
                                                <p className="text-[10px] text-gray-400 mt-1">
                                                    Alternatives: {med.alternatives.join(", ")}
                                                </p>
                                            )}
                                            {med.precautions?.length > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                    <p className="text-[10px] font-semibold text-amber-600">Precautions:</p>
                                                    <ul className="list-disc list-inside text-[10px] text-gray-500">
                                                        {med.precautions.map((prec, i) => (
                                                            <li key={i}>{prec}</li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Diagnostic Suggestions */}
                        {suggestions.diagnosticSuggestions && (
                            <div className="bg-white rounded-xl border border-purple-100 p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                                    </svg>
                                    <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wide">Diagnostic Insights</h4>
                                </div>

                                {suggestions.diagnosticSuggestions.possibleConditions?.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Possible Conditions</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {suggestions.diagnosticSuggestions.possibleConditions.map((condition, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => applyDiagnosisSuggestion(condition)}
                                                    className="px-2 py-1 text-[10px] bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg transition-colors"
                                                >
                                                    {condition}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {suggestions.diagnosticSuggestions.suggestedTests?.length > 0 && (
                                    <div className="mb-3">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1.5">Suggested Tests</p>
                                        <ul className="space-y-1">
                                            {suggestions.diagnosticSuggestions.suggestedTests.map((test, i) => (
                                                <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                                                    <span className="text-purple-400">•</span>
                                                    {test}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {suggestions.diagnosticSuggestions.specialistReferral && (
                                    <div className="mt-2 pt-2 border-t border-purple-100">
                                        <p className="text-[10px] font-semibold text-orange-600">
                                            Referral: {suggestions.diagnosticSuggestions.specialistReferral}
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Lifestyle Recommendations */}
                        {suggestions.lifestyleRecommendations && (
                            <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl p-4 border border-teal-100">
                                <div className="flex items-center gap-2 mb-3">
                                    <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                                    </svg>
                                    <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wide">Lifestyle Recommendations</h4>
                                </div>

                                {suggestions.lifestyleRecommendations.dietary?.length > 0 && (
                                    <div className="mb-2">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1">🥗 Dietary</p>
                                        <ul className="space-y-0.5">
                                            {suggestions.lifestyleRecommendations.dietary.map((item, i) => (
                                                <li key={i} className="text-xs text-gray-600">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {suggestions.lifestyleRecommendations.activity?.length > 0 && (
                                    <div className="mb-2">
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1">🏃 Activity</p>
                                        <ul className="space-y-0.5">
                                            {suggestions.lifestyleRecommendations.activity.map((item, i) => (
                                                <li key={i} className="text-xs text-gray-600">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}

                                {suggestions.lifestyleRecommendations.monitoring?.length > 0 && (
                                    <div>
                                        <p className="text-[10px] font-semibold text-gray-500 mb-1">📊 Monitoring</p>
                                        <ul className="space-y-0.5">
                                            {suggestions.lifestyleRecommendations.monitoring.map((item, i) => (
                                                <li key={i} className="text-xs text-gray-600">{item}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Follow-up Recommendation */}
                        {suggestions.followUpRecommendation && (
                            <div className="bg-amber-50 rounded-xl p-3 border border-amber-100">
                                <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <p className="text-xs font-semibold text-amber-800">
                                        Follow-up in {suggestions.followUpRecommendation.timing}
                                    </p>
                                </div>
                                <p className="text-xs text-amber-700 mt-1">{suggestions.followUpRecommendation.reason}</p>
                            </div>
                        )}

                        {/* Disclaimer */}
                        {displayedText.disclaimer && (
                            <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                <p className="text-[10px] text-gray-500 italic">
                                    {displayedText.disclaimer}
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer - unchanged */}
            {suggestions && (
                <div className="p-3 border-t border-gray-100 bg-gray-50">
                    <p className="text-[9px] text-gray-400 text-center">
                        AI suggestions are for clinical decision support only
                    </p>
                </div>
            )}

            <style jsx>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-slideIn {
                    animation: slideIn 0.3s ease-out;
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-out;
                }
                .animation-delay-200 {
                    animation-delay: 200ms;
                }
                .animation-delay-400 {
                    animation-delay: 400ms;
                }
            `}</style>
        </div>
    );
}

export default AIPrescriptionSuggestions;