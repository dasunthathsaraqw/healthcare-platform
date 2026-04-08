const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

const doctorRoutes = require("./src/routes/doctorRoutes");
const adminRoutes  = require("./src/routes/adminRoutes");

const app = express();
const PORT = process.env.PORT || 3002;
const DB_URL = process.env.DB_URL || "mongodb://localhost:27017/doctor-service";

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://api-gateway:8080",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/doctors", doctorRoutes);
app.use("/api/admin",   adminRoutes);

// ── Health check ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    service: "doctor-service",
    timestamp: new Date(),
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
  });
});

// ── Root ───────────────────────────────────────────────────────────────────────
app.get("/", (req, res) => {
  res.json({
    name: "Doctor Service",
    version: "1.0.0",
    endpoints: [
      "POST   /api/doctors/register",
      "POST   /api/doctors/login",
      "GET    /api/doctors                 (public - search)",
      "GET    /api/doctors/:id             (public - profile)",
      "GET    /api/doctors/:id/availability (public - slots)",
      "GET    /api/doctors/profile",
      "PUT    /api/doctors/profile",
      "PUT    /api/doctors/change-password",
      "GET    /api/doctors/availability",
      "POST   /api/doctors/availability",
      "PUT    /api/doctors/availability/:id",
      "DELETE /api/doctors/availability/:id",
      "GET    /api/doctors/appointments",
      "PUT    /api/doctors/appointments/:id/accept",
      "PUT    /api/doctors/appointments/:id/reject",
      "PUT    /api/doctors/appointments/:id/complete",
      "GET    /api/doctors/prescriptions",
      "POST   /api/doctors/prescriptions",
      "GET    /api/doctors/patients",
      "GET    /api/doctors/patients/:patientId",
      "GET    /api/doctors/dashboard/stats",
      "GET    /api/admin/doctors/pending",
      "GET    /api/admin/doctors/verified",
      "GET    /api/admin/doctors",
      "PUT    /api/admin/doctors/:id/verify",
      "PUT    /api/admin/doctors/:id/reject",
    ],
  });
});

// ── Global error handler ───────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ── 404 handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ── MongoDB connection + server start ────────────────────────────────────────
const startServer = async () => {
  try {
    await mongoose.connect(DB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ MongoDB connected: ${DB_URL}`);

    app.listen(PORT, () => {
      console.log(`🚀 Doctor Service running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ Failed to connect to MongoDB:", err.message);
    process.exit(1);
  }
};

// Graceful shutdown
process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

startServer();
