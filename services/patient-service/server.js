const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer"); // added for error handling
const path = require('path');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS for better compatibility
app.use(
  cors({
    origin: ["http://localhost:3000", "http://localhost:8080"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ===== REQUEST LOGGING (must come before any route/body parser) =====
app.use((req, res, next) => {
  console.log(`📥 [${new Date().toISOString()}] ${req.method} ${req.path}`);
  // Log headers only for debug if needed (optional)
  // console.log('Headers:', req.headers);
  next();
});

// Body parsers – these do NOT interfere with multipart/form-data (handled by multer)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Audit logging middleware
const auditLog = require('./src/middleware/auditMiddleware');
app.use(auditLog);

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// MongoDB Connection
const dbUrl = process.env.DB_URL || "mongodb://patient-db:27017/patientdb";
console.log(`🔗 Connecting to MongoDB at: ${dbUrl}`);

mongoose
  .connect(dbUrl)
  .then(() =>
    console.log("✅ Patient Service: Connected to Patient Service MongoDB")
  )
  .catch((err) =>
    console.error("❌ Patient Service: MongoDB connection error:", err.message)
  );

mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err);
});
mongoose.connection.on("disconnected", () => {
  console.log("MongoDB disconnected");
});

// RabbitMQ connection
//const { connectRabbitMQ } = require("./src/utils/rabbitmq");
//connectRabbitMQ();

// Health Check
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

// ===== TEST UPLOAD ENDPOINT (no auth, for debugging only) =====
const upload = require("./src/middleware/upload"); // import at top if not already
app.post('/test-upload', upload.single('document'), async (req, res) => {
  console.log('🧪 Test upload - file:', req.file);
  if (!req.file) {
    return res.status(400).json({ error: 'No file received' });
  }
  res.json({ 
    message: 'File received successfully', 
    filename: req.file.originalname,
    size: req.file.size 
  });
});
// ===== END TEST ENDPOINT =====

// Routes
const authRoutes = require("./src/routes/authRoutes");
app.use("/api/auth", authRoutes);

// Doctor-facing: read-only patient data (profile, metrics, reports)
// IMPORTANT: Must be registered BEFORE patientRoutes which has a wildcard /:id
const doctorViewRoutes = require('./src/routes/doctorViewRoutes');
app.use("/api/patients/doctor", doctorViewRoutes);

const patientRoutes = require("./src/routes/patientRoutes-auth");
app.use("/api/patients", patientRoutes);

const metricsRoutes = require("./src/routes/metricsRoutes");
app.use("/api/patients", metricsRoutes);

// 404 Handler
app.use((req, res) => {
  console.log(`❌ 404 Not Found: ${req.method} ${req.url}`);
  if (!res.headersSent) {
    res.status(404).json({ error: "Route not found" });
  }
});

// Global Error Handler (must be last)
app.use((err, req, res, next) => {
  // Handle aborted requests
  if (err.type === "request.aborted" || err.message === "request aborted") {
    console.log("⚠️ Request aborted by client – ignoring");
    return;
  }

  console.error("❌ Global Error Handler:", err.stack);

  // Handle Multer errors
  if (err instanceof multer.MulterError) {
    if (!res.headersSent) {
      return res.status(400).json({
        success: false,
        message: `File upload error: ${err.message}`,
      });
    }
    return;
  }

  // Handle other errors
  if (!res.headersSent) {
    res.status(err.status || 500).json({
      success: false,
      error: "Something went wrong!",
      message: err.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Patient Service running on port ${PORT}`);
});