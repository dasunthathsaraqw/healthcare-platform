import axios from "axios";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30 second timeout
  withCredentials: false, // Don't send credentials
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`🚀 API Request: ${config.method.toUpperCase()} ${config.url}`);
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => {
    console.error("Request Error:", error);
    return Promise.reject(error);
  },
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`✅ API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error("Response Error:", error);

    if (error.code === "ECONNABORTED") {
      console.error("Request timeout");
      return Promise.reject({
        message: "Request timeout. Server took too long to respond.",
      });
    }

    if (error.response?.status === 401) {
      if (typeof window !== "undefined") {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        window.location.href = "/login";
      }
    }

    if (!error.response) {
      console.error("Network error - no response received");
      return Promise.reject({
        message: "Network error. Please check your connection.",
      });
    }

    return Promise.reject(error);
  },
);

export default api;
