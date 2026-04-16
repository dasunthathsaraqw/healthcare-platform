const { buildQuestionPrompt, buildInsightsPrompt } = require("../utils/promptBuilder");
const { generateGeminiText } = require("./geminiService");

const analyze = async (payload) => {
  const symptomsText = Array.isArray(payload?.symptoms)
    ? payload.symptoms.join(", ")
    : String(payload?.symptoms || "");

  const includeProfile = Boolean(payload?.age || payload?.gender || payload?.notes);
  const profileData = {
    age: payload?.age || null,
    gender: payload?.gender || null,
    notes: payload?.notes || null,
  };

  const prompt = buildQuestionPrompt(symptomsText, includeProfile, profileData);
  const aiText = await generateGeminiText(prompt);
  return { type: "analysis", result: aiText };
};

const getInsights = async (payload) => {
  const symptomsText = Array.isArray(payload?.symptoms)
    ? payload.symptoms.join(", ")
    : String(payload?.symptoms || "");
  const answers = payload?.answers || {
    lifestyle: payload?.lifestyle || null,
    history: payload?.history || null,
  };

  const includeProfile = Boolean(payload?.profileData);
  const profileData = payload?.profileData || {};

  const prompt = buildInsightsPrompt(symptomsText, answers, includeProfile, profileData);
  const aiText = await generateGeminiText(prompt);
  return { type: "insights", result: aiText };
};

module.exports = {
  analyze,
  getInsights,
};
