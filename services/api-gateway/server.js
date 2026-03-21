const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(helmet());
app.use(cors());
app.use(morgan("combined"));
app.use(express.json());

// Health check for gateway
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "api-gateway",
    timestamp: new Date().toISOString(),
  });
});

// Service endpoints
const services = {
  patient: process.env.PATIENT_SERVICE || "http://patient-service:3001",
  doctor: process.env.DOCTOR_SERVICE || "http://doctor-service:3002",
  appointment:
    process.env.APPOINTMENT_SERVICE || "http://appointment-service:3003",
  payment: process.env.PAYMENT_SERVICE || "http://payment-service:3004",
  notification:
    process.env.NOTIFICATION_SERVICE || "http://notification-service:3005",
  ai: process.env.AI_SYMPTOM_CHECKER || "http://ai-symptom-checker:3006",
};

// Proxy configurations
app.use(
  "/api/patients",
  createProxyMiddleware({
    target: services.patient,
    changeOrigin: true,
    pathRewrite: { "^/api/patients": "/api/patients" },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Patient service unavailable" });
    },
  }),
);

app.use(
  "/api/doctors",
  createProxyMiddleware({
    target: services.doctor,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Doctor service unavailable" });
    },
  }),
);

app.use(
  "/api/appointments",
  createProxyMiddleware({
    target: services.appointment,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Appointment service unavailable" });
    },
  }),
);

app.use(
  "/api/payments",
  createProxyMiddleware({
    target: services.payment,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Payment service unavailable" });
    },
  }),
);

app.use(
  "/api/notifications",
  createProxyMiddleware({
    target: services.notification,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Notification service unavailable" });
    },
  }),
);

app.use(
  "/api/symptom-checker",
  createProxyMiddleware({
    target: services.ai,
    changeOrigin: true,
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "AI Symptom Checker service unavailable" });
    },
  }),
);

// Auth routes (no authentication required)
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: services.patient,
    changeOrigin: true,
    pathRewrite: { "^/api/auth": "/api/auth" },
    onError: (err, req, res) => {
      console.error("Proxy error:", err);
      res.status(500).json({ error: "Auth service unavailable" });
    },
  }),
);

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "Healthcare Platform API Gateway",
    version: "1.0.0",
    services: Object.keys(services),
    endpoints: {
      auth: "/api/auth",
      patients: "/api/patients",
      doctors: "/api/doctors",
      appointments: "/api/appointments",
      payments: "/api/payments",
      notifications: "/api/notifications",
      symptomChecker: "/api/symptom-checker",
    },
  });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT} ---------------`);
  console.log(` Available routes:`);
  console.log(`   - Health: http://localhost:${PORT}/health`);
  console.log(`   - Auth: http://localhost:${PORT}/api/auth`);
  console.log(`   - Patients: http://localhost:${PORT}/api/patients`);
  console.log(`   - Doctors: http://localhost:${PORT}/api/doctors`);
  console.log(`   - Appointments: http://localhost:${PORT}/api/appointments`);
  console.log(`   - Payments: http://localhost:${PORT}/api/payments`);
  console.log(`   - Notifications: http://localhost:${PORT}/api/notifications`);
  console.log(
    `   - AI Symptom Checker: http://localhost:${PORT}/api/symptom-checker`,
  );
});
