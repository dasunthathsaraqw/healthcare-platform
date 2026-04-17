const express = require("express");
const http = require("http");
const cors = require("cors");
const morgan = require("morgan");
require("dotenv").config();

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
  telemedicine: process.env.TELEMEDICINE_SERVICE || "http://telemedicine-service:3008",
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

const fetchJson = (target) =>
  new Promise((resolve) => {
    const url = new URL(target);
    const request = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method: "GET",
        timeout: 4000,
      },
      (response) => {
        let data = "";
        response.on("data", (chunk) => {
          data += chunk;
        });
        response.on("end", () => {
          try {
            resolve({
              ok: response.statusCode >= 200 && response.statusCode < 300,
              status: response.statusCode,
              body: data ? JSON.parse(data) : {},
            });
          } catch (_error) {
            resolve({
              ok: false,
              status: response.statusCode,
              body: { message: "Invalid JSON response" },
            });
          }
        });
      }
    );

    request.on("timeout", () => {
      request.destroy(new Error("Request timed out"));
    });
    request.on("error", (error) => {
      resolve({
        ok: false,
        status: 500,
        body: { message: error.message },
      });
    });
    request.end();
  });

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

// AI Checker (alias used by the patient-side AI checker UI)
app.use(
  "/api/ai-checker",
  handleProxy(services.ai, "/api/ai-checker"),
);

// Admin routes (doctor verification etc.) — proxied to doctor-service admin endpoints
app.use("/api/admin", handleProxy(services.admin, "/api/admin"));

// Telemedicine Service
app.use(
  "/api/telemedicine",
  handleProxy(services.telemedicine, "/api/telemedicine"),
);

app.get("/api/system/health", async (_req, res) => {
  const healthTargets = {
    patient: services.patient,
    doctor: services.doctor,
    appointment: services.appointment,
    payment: services.payment,
    notification: services.notification,
    telemedicine: services.telemedicine,
    ai: services.ai,
  };

  const entries = await Promise.all(
    Object.entries(healthTargets).map(async ([serviceName, baseUrl]) => {
      const response = await fetchJson(`${baseUrl}/health`);
      return [
        serviceName,
        {
          ok: response.ok,
          status: response.status,
          details: response.body,
        },
      ];
    })
  );

  res.status(200).json({
    success: true,
    services: Object.fromEntries(entries),
  });
});

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
