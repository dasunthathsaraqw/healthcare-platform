import axios from "axios";

// Route through the API Gateway (port 8080) so it works uniformly inside Docker
// and in local dev.  The gateway now forwards /api/ai-checker → ai-symptom-checker-service.
const AI_CHECKER_BASE_URL =
  process.env.NEXT_PUBLIC_AI_CHECKER_API_URL ||
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/?$/, "") ||
  "http://localhost:8080";

const aiCheckerApi = axios.create({
  baseURL: AI_CHECKER_BASE_URL.replace(/\/+$/, ""),
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000,
});

class AICheckerService {
  async analyzeSymptoms({ symptoms, includeProfile, profileData }) {
    try {
      const response = await aiCheckerApi.post("/api/ai-checker/analyze", {
        symptoms,
        includeProfile,
        profileData,
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { message: error.message || "Failed to analyze symptoms." };
    }
  }

  async generateInsights({ symptoms, answers, includeProfile, profileData }) {
    try {
      const response = await aiCheckerApi.post("/api/ai-checker/insights", {
        symptoms,
        answers,
        includeProfile,
        profileData,
      });
      return response.data;
    } catch (error) {
      if (error.response?.data) {
        throw error.response.data;
      }
      throw { message: error.message || "Failed to generate insights." };
    }
  }
}

export default new AICheckerService();
