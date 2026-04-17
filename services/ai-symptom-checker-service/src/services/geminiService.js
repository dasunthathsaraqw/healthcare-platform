const axios = require("axios");

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-2.5-flash";
const GEMINI_ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

const RETRYABLE_STATUS_CODES = new Set([429, 502, 503, 504]);

const parseRetryAfterSeconds = (value) => {
  if (!value) return null;
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return null;
};

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const calculateRetryDelayMs = (attempt, retryAfterHeader) => {
  const retryAfterSeconds = parseRetryAfterSeconds(retryAfterHeader);
  if (retryAfterSeconds) {
    return Math.min(retryAfterSeconds * 1000, 30000);
  }

  // Exponential backoff with small jitter to reduce request bursts.
  const baseMs = 2000 * Math.pow(2, attempt - 1);
  const jitterMs = Math.floor(Math.random() * 500);
  return Math.min(baseMs + jitterMs, 30000);
};

const extractProviderErrorMessage = (err) => {
  const payload = err.response?.data;
  if (!payload) return null;

  if (typeof payload === "string" && payload.trim()) {
    return payload.trim();
  }

  if (payload?.error?.message) return payload.error.message;
  if (payload?.message) return payload.message;

  return null;
};

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
      // Re-throw only our own normalized errors.
      // Axios errors may also expose `status`, so ensure we don't skip retry/remap logic.
      if (err.status && !err.response) {
        throw err;
      }

      const status = err.response?.status || (err.code === "ECONNABORTED" ? 504 : 502);
      const retryAfterHeader = err.response?.headers?.["retry-after"];

      if (RETRYABLE_STATUS_CODES.has(status) && attempt < retries) {
        const retryDelayMs = calculateRetryDelayMs(attempt, retryAfterHeader);
        console.warn(
          `[Gemini API] Failed with status ${status}. Retrying attempt ${attempt + 1}/${retries} in ${retryDelayMs}ms...`,
        );
        await delay(retryDelayMs);
        continue;
      }

      const providerMessage = extractProviderErrorMessage(err);
      let message =
        providerMessage ||
        (status === 503
          ? "AI provider is temporarily unavailable. Please try again in a moment."
          : err.message) ||
        "Failed to get response from Gemini API.";

      if (/^Request failed with status code 503$/i.test(message)) {
        message = "AI provider is temporarily unavailable. Please try again in a moment.";
      }

      const error = new Error(message);
      // Surface hard rate-limit failures as temporary upstream unavailability
      // so the client can show a retry-later message.
      error.status = status === 429 ? 503 : status;
      throw error;
    }
  }
};

module.exports = {
  generateGeminiText,
};
