const { generateGeminiText } = require("./geminiService");
const { buildPrescriptionSuggestionPrompt } = require("../utils/prescriptionPromptBuilder");

const getPrescriptionSuggestions = async (payload) => {
    const {
        patientData,
        appointmentData,
        prescriptionData,
        previousPrescriptions = [],
        previousDiagnosis = [],
    } = payload;

    const prompt = buildPrescriptionSuggestionPrompt(
        patientData,
        appointmentData,
        prescriptionData,
        previousPrescriptions,
        previousDiagnosis
    );

    const aiText = await generateGeminiText(prompt);
    return { type: "prescription_suggestions", result: aiText };
};

module.exports = {
    getPrescriptionSuggestions,
};