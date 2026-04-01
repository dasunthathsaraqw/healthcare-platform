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

// Request logging middleware
app.use((req, res, next) => {
  console.log(`\n📝 ${req.method} ${req.url}`);
  console.log("📦 Body:", req.body);
  next();
});

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

const { connectRabbitMQ } = require('./src/utils/rabbitmq');

// Connect to RabbitMQ
connectRabbitMQ();

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

// Routes
console.log("📌 Registering routes...");
app.use("/api/auth", authRoutes);
console.log("✅ Auth routes registered at /api/auth");

//add on 1st of april
const patientRoutes = require('./src/routes/patientRoutes-auth');
app.use("/api/patients", patientRoutes);
console.log("✅ Patient routes registered at /api/patients");

// Test route to verify service is working
app.get("/test", (req, res) => {
  res.json({
    message: "Test endpoint working!",
    timestamp: new Date().toISOString(),
  });
});

// Simple test POST endpoint
app.post("/test-post", (req, res) => {
  console.log("Test POST received:", req.body);
  res.json({ message: "Test POST working!", received: req.body });
});

// Error Handler - Handle aborted requests gracefully
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

// 404 Handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  if (!res.headersSent) {
    res.status(404).json({ error: "Route not found" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Patient Service running on port ${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Test: http://localhost:${PORT}/test`);
  console.log(`   Auth: http://localhost:${PORT}/api/auth`);
});
