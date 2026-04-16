// server.js — Bootstrap only.
// Responsibilities:
//   1. Load environment variables (.env)
//   2. Connect to MongoDB (via src/config/db.js)
//   3. Import the configured Express app (via src/app.js)
//   4. Bind the HTTP server to PORT
//
// All Express middleware, routes, and error handlers live in src/app.js.
// All DB connection logic lives in src/config/db.js.

"use strict";

const dotenv = require("dotenv");
dotenv.config(); // Must be first — env vars must exist before any imports read them

const { connectDB } = require("./src/config/db");
const app = require("./src/app");

const PORT = process.env.PORT || 3008;
const NODE_ENV = process.env.NODE_ENV || "development";
const DB_URL = process.env.MONGODB_URI || process.env.DB_URL || "mongodb://telemedicine-db:27017/telemedicinedb";

// ── Startup ────────────────────────────────────────────────────────────────────
const start = async () => {
  try {
    // 1. Connect to MongoDB — fail fast if unreachable
    await connectDB();

    // 2. Connect to RabbitMQ — non-fatal (events drop gracefully if unavailable)
    const { connectRabbitMQ } = require("./src/utils/rabbitmq");
    connectRabbitMQ().catch((e) =>
      console.warn("⚠️  RabbitMQ unavailable at startup — events will be skipped:", e.message)
    );

    // 3. Start HTTP server
    app.listen(PORT, () => {
      console.log("");
      console.log("╔══════════════════════════════════════════════════════════╗");
      console.log("║          🏥  Telemedicine Service  — ONLINE              ║");
      console.log("╚══════════════════════════════════════════════════════════╝");
      console.log(`  🚀  Port      : ${PORT}`);
      console.log(`  🌍  Env       : ${NODE_ENV}`);
      console.log(`  🗄️  Database  : ${DB_URL}`);
      console.log(`  🔔  RabbitMQ  : ${process.env.RABBITMQ_URL || "amqp://localhost:5672"}`);
      console.log(`  🔗  Health    : http://localhost:${PORT}/health`);
      console.log(`  📋  API root  : http://localhost:${PORT}/api/telemedicine`);
      if (process.env.BYPASS_AUTH === "true")
        console.log(`  ⚠️   Auth      : BYPASS MODE (mock user: ${process.env.MOCK_USER_ROLE || "patient"})`);
      console.log("");
    });
  } catch (error) {
    console.error("❌ Failed to start Telemedicine Service:", error.message);
    process.exit(1);
  }
};

// ── Graceful shutdown ──────────────────────────────────────────────────────────
process.on("SIGTERM", () => {
  console.log("⚠️  SIGTERM received — shutting down gracefully...");
  process.exit(0);
});

process.on("SIGINT", () => {
  console.log("⚠️  SIGINT received — shutting down gracefully...");
  process.exit(0);
});

// ── Unhandled rejection safety net ────────────────────────────────────────────
process.on("unhandledRejection", (reason) => {
  console.error("❌ Unhandled Promise Rejection:", reason);
  process.exit(1);
});

start();

