const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const authRoutes = require("./src/routes/authRoutes");

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Enhanced CORS for better compatibility
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8080"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));



// MongoDB Connection - FIXED: Remove deprecated options
const dbUrl = process.env.DB_URL || "mongodb://patient-db:27017/patientdb";
console.log(`🔗 Connecting to MongoDB at: ${dbUrl}`);

mongoose
  .connect(dbUrl)
  .then(() =>
    console.log("✅ Patient Service: Connected to Patient Service MongoDB"),
  )
  .catch((err) =>
    console.error("❌ Patient Service: MongoDB connection error:", err.message),
  );

// Handle connection events
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// const { connectRabbitMQ } = require('./src/utils/rabbitmq');

// // Connect to RabbitMQ
// connectRabbitMQ();

// Health Check with database status
app.get("/health", (req, res) => {
  const dbStatus =
    mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "OK",
    service: "patient-service",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);

const patientRoutes = require('./src/routes/patientRoutes-auth');
app.use("/api/patients", patientRoutes);

const metricsRoutes = require('./src/routes/metricsRoutes');
app.use("/api/patients", metricsRoutes);



// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  // Check if it's an aborted request
  if (err.type === "request.aborted" || err.message === "request aborted") {
    console.log("⚠️ Request was aborted by client - ignoring");
    return; // Don't send response for aborted requests
  }

  console.error("❌ Error handler caught:", err.stack);

  // Only send response if headers haven't been sent
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      error: "Something went wrong!",
      message: err.message,
    });
  }
});

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  if (!res.headersSent) {
    res.status(404).json({ error: "Route not found" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Patient Service running on port ${PORT}`);
});
