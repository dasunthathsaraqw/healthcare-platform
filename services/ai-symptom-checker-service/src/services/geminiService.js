const axios = require("axios");

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-1.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const generateGeminiText = async (prompt) => {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    const error = new Error("GEMINI_API_KEY is missing in environment variables.");
    error.status = 500;
    throw error;
  }

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    const error = new Error("Prompt must be a non-empty string.");
    error.status = 400;
    throw error;
  }

  try {
    const response = await axios.post(
      `${GEMINI_ENDPOINT}?key=${apiKey}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
      },
      {
        headers: { "Content-Type": "application/json" },
        timeout: 15000,
      },
    );

    const text = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      const error = new Error("Gemini returned an empty response.");
      error.status = 502;
      throw error;
    }

    return text;
  } catch (err) {
    if (err.status) {
      throw err;
    }

    const message =
      err.response?.data?.error?.message ||
      err.message ||
      "Failed to get response from Gemini API.";
    const error = new Error(message);
    error.status = err.response?.status || 502;
    throw error;
  }
};

module.exports = {
  generateGeminiText,
};
