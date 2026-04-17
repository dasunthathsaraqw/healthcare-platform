const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const aiCheckerRoutes = require("./routes/aiCheckerRoutes");
const prescriptionSuggestionRoutes = require("./routes/prescriptionSuggestionRoutes");


const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser clients (Postman/curl) and same-origin requests.
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        process.env.FRONTEND_URL,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ].filter(Boolean);

      // Dev-friendly: allow localhost/127.0.0.1 with any port.
      const isLocalhost =
        /^https?:\/\/localhost(?::\d+)?$/.test(origin) ||
        /^https?:\/\/127\.0\.0\.1(?::\d+)?$/.test(origin);

      if (allowedOrigins.includes(origin) || isLocalhost) {
        return callback(null, true);
      }

      return callback(new Error("CORS not allowed for this origin."));
    },
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));


app.get("/", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "ai-symptom-checker-service",
    message: "AI Symptom Checker service is running",
  });
});

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "ai-symptom-checker-service",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/ai-checker", aiCheckerRoutes);
app.use("/api/ai-checker/prescription", prescriptionSuggestionRoutes);


app.use((err, req, res, next) => {
  console.error("Unhandled error:", err.message);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

module.exports = app;
