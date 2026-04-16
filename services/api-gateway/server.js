const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");

const app = express();
const PORT = process.env.PORT || 8080;

// CORS configuration
app.use(
  cors({
    origin: [
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      "localhost:3000",
    ],
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(morgan("dev"));
app.use(express.json());

// Service URLs from environment variables
const services = {
  patient: process.env.PATIENT_SERVICE || "http://patient-service:3001",
  doctor: process.env.DOCTOR_SERVICE || "http://doctor-service:3002",
  appointment:
    process.env.APPOINTMENT_SERVICE || "http://appointment-service:3003",
  payment: process.env.PAYMENT_SERVICE || "http://payment-service:3004",
  notification:
    process.env.NOTIFICATION_SERVICE || "http://notification-service:3005",
  ai: process.env.AI_SYMPTOM_CHECKER || "http://ai-symptom-checker:3006",
  // Admin routes are served by the doctor-service (it owns doctor verification)
  admin: process.env.ADMIN_SERVICE || process.env.DOCTOR_SERVICE || "http://doctor-service:3002",
};

// --- Reusable Proxy Function to keep code clean ---
const handleProxy = (targetUrl, routeName) => (req, res) => {
  console.log(
    `🔄 Proxying ${req.method} ${routeName}${req.url} to ${targetUrl}${routeName}${req.url}`,
  );

  const contentType = req.headers["content-type"] || "";
  const isJson = contentType.includes("application/json");
  const shouldStreamBody =
    ["POST", "PUT", "PATCH"].includes(req.method) && !isJson;

  const url = new URL(`${targetUrl}${routeName}${req.url}`);
  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search, // include query strings if any
    method: req.method,
    headers: {
      ...req.headers,
      host: url.hostname,
    },
  };

  // For parsed JSON bodies, let Node set transfer headers instead of forwarding stale browser values.
  if (!shouldStreamBody) {
    delete options.headers["content-length"];
  }

  const proxyReq = http.request(options, (proxyRes) => {
    res.status(proxyRes.statusCode);
    // Forward headers from the microservice back to the client
    Object.keys(proxyRes.headers).forEach((key) => {
      res.setHeader(key, proxyRes.headers[key]);
    });

    proxyRes.pipe(res); // Stream the response directly for better performance
  });

  // Allow larger request windows for report/document uploads.
  proxyReq.setTimeout(120000, () => {
    proxyReq.destroy(new Error("Upstream request timed out"));
  });

  proxyReq.on("error", (err) => {
    console.error(`[${routeName}] Proxy error:`, err);
    if (!res.headersSent) {
      res.status(504).json({ error: "Gateway Error", message: err.message });
    }
  });

  if (shouldStreamBody) {
    req.pipe(proxyReq);
    return;
  }

  // Handle request body
  if (req.body && Object.keys(req.body).length > 0) {
    const body = JSON.stringify(req.body);
    proxyReq.write(body);
  }
  proxyReq.end();
};

// ================= ROUTE MAPPINGS =================

// Auth & Patients (Both go to Patient Service)
app.use("/api/auth", handleProxy(services.patient, "/api/auth"));
app.use("/api/patients", handleProxy(services.patient, "/api/patients"));

// Doctor Service
app.use("/api/doctors", handleProxy(services.doctor, "/api/doctors"));

// Appointment Service
app.use(
  "/api/appointments",
  handleProxy(services.appointment, "/api/appointments"),
);

// Payment Service
app.use("/api/payments", handleProxy(services.payment, "/api/payments"));

// Notification Service
app.use(
  "/api/notifications",
  handleProxy(services.notification, "/api/notifications"),
);

// AI Symptom Checker
app.use(
  "/api/symptom-checker",
  handleProxy(services.ai, "/api/symptom-checker"),
);

// Admin routes (doctor verification etc.) — proxied to doctor-service admin endpoints
app.use("/api/admin", handleProxy(services.admin, "/api/admin"));

// ================= UTILITY ROUTES =================

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "OK", service: "api-gateway", timestamp: new Date() });
});

// Test route
app.post("/test", (req, res) => {
  res.json({
    success: true,
    message: "Gateway test endpoint works!",
    received: req.body,
  });
});

// Root route
app.get("/", (req, res) => {
  res.json({
    name: "Healthcare Platform API Gateway",
    version: "1.0.0",
    endpoints: Object.keys(services),
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway running on port ${PORT}`);
  Object.entries(services).forEach(([name, url]) => {
    console.log(`   Mapped ${name.padEnd(12)} -> ${url}`);
  });
});
