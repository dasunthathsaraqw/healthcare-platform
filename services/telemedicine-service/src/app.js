// src/app.js
// Pure Express application factory.
// Responsibilities:
//   • Middleware stack (CORS, body parsing, request logging)
//   • Health check route
//   • Feature routes under /api/telemedicine
//   • 404 handler (notFound middleware)
//   • Global error handler (errorHandler middleware)
//
// server.js is the ONLY caller — it loads .env, connects DB, then calls app.listen().
// Keeping concerns separate makes the app independently testable without a port.

"use strict";

const express   = require("express");
const cors      = require("cors");
const mongoose  = require("mongoose");

const { notFound }     = require("./middleware/notFound");
const { errorHandler } = require("./middleware/errorHandler");

const app = express();

// ── CORS ───────────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: [
      process.env.FRONTEND_URL || "http://localhost:3000",
      "http://localhost:8080",
      "http://api-gateway:8080",
    ],
    credentials: true,
    methods:     ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// ── Body Parsers ───────────────────────────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ── Request Logger ─────────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  console.log(`📝 [${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// ── Health Check ───────────────────────────────────────────────────────────────
// Mounted BEFORE feature routes — the API gateway polls this without auth.
app.get("/health", (_req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status:    "OK",
    service:   "telemedicine-service",
    database:  dbStatus,
    uptime:    `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

// ── Root Info (API index) ──────────────────────────────────────────────────────
app.get("/", (_req, res) => {
  res.json({
    name:    "Telemedicine Service",
    version: "1.0.0",
    routes: [
      "GET    /health",
      "POST   /api/telemedicine/sessions",
      "GET    /api/telemedicine/sessions/appointment/:appointmentId",
      "GET    /api/telemedicine/sessions/patient/:patientId",
      "GET    /api/telemedicine/sessions/doctor/:doctorId",
      "POST   /api/telemedicine/sessions/:appointmentId/join",
      "PATCH  /api/telemedicine/sessions/:id/start",
      "PATCH  /api/telemedicine/sessions/:id/end",
      "PATCH  /api/telemedicine/sessions/:id/cancel",
      "PATCH  /api/telemedicine/sessions/:id/notes",
      "GET    /api/telemedicine/sessions/:id",
      "GET    /api/telemedicine/chat/:appointmentId",
      "POST   /api/telemedicine/chat/:appointmentId",
      "GET    /api/telemedicine/chat/:appointmentId/unread",
      "PATCH  /api/telemedicine/chat/:appointmentId/read",
    ],
  });
});

// ── Feature Routes ─────────────────────────────────────────────────────────────
// All session endpoints live under /api/telemedicine/sessions.
// Chat endpoints live under /api/telemedicine/chat.
app.use("/api/telemedicine/sessions", require("./routes/sessionRouter"));
app.use("/api/telemedicine/chat",     require("./routes/chatRouter"));

// ── 404 Handler ────────────────────────────────────────────────────────────────
// Catches any request that didn't match a real route above.
app.use(notFound);

// ── Global Error Handler ───────────────────────────────────────────────────────
// MUST be the last middleware — Express identifies it by its 4-arg signature.
// Handles: ApiError, Mongoose errors, JWT errors, generic 500.
app.use(errorHandler);

module.exports = app;
