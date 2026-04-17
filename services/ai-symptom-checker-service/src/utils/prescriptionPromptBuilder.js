// ai-symptom-checker-service/src/utils/prescriptionPromptBuilder.js

const safeJson = (data) => JSON.stringify(data || {}, null, 2);

// Truncate long strings to reduce token usage
const truncateString = (str, maxLength = 500) => {
    if (!str || typeof str !== "string") return str;
    return str.length > maxLength ? str.substring(0, maxLength) + "..." : str;
};

// Summarize previous prescriptions to reduce size
const summarizePrescriptions = (prescriptions) => {
    if (!prescriptions || prescriptions.length === 0) return [];

    return prescriptions.slice(0, 3).map(rx => ({
        diagnosis: truncateString(rx.diagnosis, 100),
        medications: (rx.medications || []).slice(0, 2).map(m => ({
            name: m.name,
            dosage: m.dosage,
            frequency: m.frequency,
        })),
        issuedAt: rx.issuedAt,
    }));
};

const buildPrescriptionSuggestionPrompt = (
    patientData,
    appointmentData,
    prescriptionData,
    previousPrescriptions,
    previousDiagnosis
) => {
    // Reduce patient data size
    const compactPatientData = {
        age: patientData?.age,
        gender: patientData?.gender,
        bloodGroup: patientData?.bloodGroup,
        allergies: (patientData?.allergies || []).slice(0, 5),
        chronicConditions: (patientData?.chronicConditions || []).slice(0, 3),
    };

    // Reduce prescription data
    const compactPrescriptionData = {
        diagnosis: truncateString(prescriptionData?.diagnosis, 200),
        medicationsCount: prescriptionData?.medications?.length || 0,
        hasNotes: !!prescriptionData?.notes,
    };

    // Summarize previous data
    const summarizedPrevious = summarizePrescriptions(previousPrescriptions);
    const recentDiagnoses = (previousDiagnosis || []).slice(0, 3);

    return `
You are a clinical decision support assistant.
Provide concise prescription suggestions based on patient data.

**PATIENT:**
Age: ${compactPatientData.age || "?"}
Gender: ${compactPatientData.gender || "?"}
Allergies: ${compactPatientData.allergies?.join(", ") || "None reported"}
Conditions: ${compactPatientData.chronicConditions?.join(", ") || "None"}

**CURRENT SITUATION:**
Diagnosis: ${compactPrescriptionData.diagnosis || "To be determined"}

**PREVIOUS PRESCRIPTIONS (last 3):**
${safeJson(summarizedPrevious)}

**PREVIOUS DIAGNOSES:**
${safeJson(recentDiagnoses)}

**OUTPUT (JSON only - no markdown):**
{
  "healthAnalysis": {
    "summary": "Brief 1-2 sentence analysis",
    "keyFindings": ["finding1", "finding2"],
    "riskFactors": ["risk1", "risk2"],
    "recommendedActions": ["action1", "action2"]
  },
  "medicationSuggestions": [
    {
      "name": "medication name",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., twice daily",
      "duration": "e.g., 7 days",
      "reasoning": "brief reason",
      "alternatives": ["alt1"],
      "precautions": ["precaution1"]
    }
  ],
  "diagnosticSuggestions": {
    "possibleConditions": ["condition1"],
    "suggestedTests": ["test1"],
    "specialistReferral": "specialty or null"
  },
  "lifestyleRecommendations": {
    "dietary": ["advice1"],
    "activity": ["advice1"],
    "monitoring": ["advice1"]
  },
  "followUpRecommendation": {
    "timing": "X days/weeks",
    "reason": "brief reason"
  },
  "disclaimer": "These are suggestions only - final decision by physician"
}`.trim();
};

module.exports = {
    buildPrescriptionSuggestionPrompt,
};