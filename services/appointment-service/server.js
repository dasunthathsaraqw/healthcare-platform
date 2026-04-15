const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3003;

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:8080",
      "http://api-gateway:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`📝 ${req.method} ${req.url}`);
  next();
});

// ── MongoDB Connection ─────────────────────────────────────────────────────────
const DB_URL = process.env.DB_URL || "mongodb://appointment-db:27017/appointmentdb";

mongoose
  .connect(DB_URL)
  .then(() => console.log("✅ Appointment Service: Connected to MongoDB"))
  .catch((err) => console.error("❌ Appointment Service: MongoDB error:", err.message));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});

// ── RabbitMQ ───────────────────────────────────────────────────────────────────
const { connectRabbitMQ } = require("./src/utils/rabbitmq");
connectRabbitMQ();

// ── Health Check ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "OK",
    service: "appointment-service",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/appointments", require("./src/routes/appointmentRouter-auth"));

// ── Global Error Handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack);
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
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`🚀 Appointment Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
});
