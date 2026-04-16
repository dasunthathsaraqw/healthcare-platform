const axios = require("axios");

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const generateGeminiText = async (prompt, retries = 3) => {
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

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        `${GEMINI_ENDPOINT}?key=${apiKey}`,
        {
          contents: [{ parts: [{ text: prompt }] }],
        },
        {
          headers: { "Content-Type": "application/json" },
          timeout: 45000,
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

      const status = err.response?.status || (err.code === 'ECONNABORTED' ? 504 : 502);
      
      // Retry on 429 (Too Many Requests), 503 (Service Unavailable), 502/504 (Gateway/Timeout)
      if ((status === 429 || status === 503 || status === 502 || status === 504) && attempt < retries) {
        console.warn(`[Gemini API] Failed with status ${status}. Retrying attempt ${attempt + 1}/${retries}...`);
        const delay = attempt * 2000; // 2s, 4s delay
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      const message =
        err.response?.data?.error?.message ||
        err.message ||
        "Failed to get response from Gemini API.";
      const error = new Error(message);
      error.status = status;
      throw error;
    }
  }
};

module.exports = {
  generateGeminiText,
};
