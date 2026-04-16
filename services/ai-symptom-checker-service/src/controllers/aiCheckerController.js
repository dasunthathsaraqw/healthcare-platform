const { buildQuestionPrompt, buildInsightsPrompt } = require("../utils/promptBuilder");
const { generateGeminiText } = require("../services/geminiService");

const cleanJsonResponse = (rawText) => {
  if (!rawText || typeof rawText !== "string") {
    throw new Error("AI response is empty.");
  }

  let cleaned = rawText.trim();

  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }

  return cleaned.trim();
};

const safeParseJson = (text) => {
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error("AI response is not valid JSON.");
  }
};

const analyzeSymptoms = async (req, res) => {
  try {
    const { symptoms, includeProfile = false, profileData = {} } = req.body;

    if (!symptoms || (typeof symptoms !== "string" && !Array.isArray(symptoms))) {
      return res.status(400).json({
        success: false,
        message: "symptoms is required and must be a string or array.",
      });
    }

    const symptomText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;
    if (!symptomText.trim()) {
      return res.status(400).json({
        success: false,
        message: "symptoms cannot be empty.",
      });
    }

    const prompt = buildQuestionPrompt(symptomText, Boolean(includeProfile), profileData);
    const rawAiText = await generateGeminiText(prompt);
    const cleanedText = cleanJsonResponse(rawAiText);
    const parsed = safeParseJson(cleanedText);

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to analyze symptoms.",
    });
  }
};

const generateInsights = async (req, res) => {
  try {
    const { symptoms, answers, includeProfile = false, profileData = {} } = req.body;

    if (!symptoms || (typeof symptoms !== "string" && !Array.isArray(symptoms))) {
      return res.status(400).json({
        success: false,
        message: "symptoms is required and must be a string or array.",
      });
    }

    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return res.status(400).json({
        success: false,
        message: "answers is required and must be an object.",
      });
    }

    const symptomText = Array.isArray(symptoms) ? symptoms.join(", ") : symptoms;
    if (!symptomText.trim()) {
      return res.status(400).json({
        success: false,
        message: "symptoms cannot be empty.",
      });
    }

    const prompt = buildInsightsPrompt(
      symptomText,
      answers,
      Boolean(includeProfile),
      profileData,
    );
    const rawAiText = await generateGeminiText(prompt);
    const cleanedText = cleanJsonResponse(rawAiText);
    const parsed = safeParseJson(cleanedText);

    return res.status(200).json({
      success: true,
      data: parsed,
    });
  } catch (error) {
    return res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to generate insights.",
    });
  }
};

module.exports = {
  analyzeSymptoms,
  generateInsights,
};
