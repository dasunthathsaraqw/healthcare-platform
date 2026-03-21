const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const dotenv = require("dotenv");

const app = express();
dotenv.config();

const PORT = process.env.PORT;

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
  patient: process.env.PATIENT_SERVICE,
  doctor: process.env.DOCTOR_SERVICE,
  appointment: process.env.APPOINTMENT_SERVICE,
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
      res.status(500).json({ error: "Service unavailable" });
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
      res.status(500).json({ error: "Service unavailable" });
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
      res.status(500).json({ error: "Service unavailable" });
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
      patients: "/api/patients",
      doctors: "/api/doctors",
      appointments: "/api/appointments",
    },
  });
});

app.listen(PORT, () => {
  console.log(`---API Gateway running on port ${PORT}---`);
  console.log(`   Available routes:`);
  console.log(`   --- Health: http://localhost:${PORT}/health`);
  console.log(`   --- Patients: http://localhost:${PORT}/api/patients`);
  console.log(`   --- Doctors: http://localhost:${PORT}/api/doctors`);
  console.log(`   --- Appointments: http://localhost:${PORT}/api/appointments`);
});
