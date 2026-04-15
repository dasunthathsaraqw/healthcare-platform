const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const { consumeNotifications, getChannel, getConnection } = require('./src/utils/rabbitmq');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3005;

// ── Middleware ─────────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── MongoDB Connection ─────────────────────────────────────────────────────────
mongoose
  .connect(process.env.DB_URL || "mongodb://notification-db:27017/notificationdb")
  .then(() => console.log("✅ Notification Service: Connected to MongoDB"))
  .catch((err) => console.error("❌ Notification Service: MongoDB error:", err.message));

// ── Routes ─────────────────────────────────────────────────────────────────────
app.use("/api/notifications/logs", require("./src/routes/logRoutes"));
app.use("/api/notifications", require("./src/routes/notificationRoutes-auth"));

// ── Health Check ───────────────────────────────────────────────────────────────
app.get("/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState === 1 ? "connected" : "disconnected";
  res.status(200).json({
    status: "OK",
    service: "notification-service",
    database: dbStatus,
    timestamp: new Date().toISOString(),
  });
});

// ── Error Handler ──────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("❌ Unhandled error:", err.stack);
  if (!res.headersSent) {
    res.status(500).json({ error: "Something went wrong!", message: err.message });
  }
});

// ── 404 Handler ────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Start RabbitMQ Consumer ────────────────────────────────────────────────────
consumeNotifications();

// ── Start HTTP Server ──────────────────────────────────────────────────────────
const server = app.listen(PORT, () => {
  console.log(`🚀 Notification Service running on port ${PORT}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// GRACEFUL SHUTDOWN
// Handles Docker SIGTERM (container stop) and Ctrl+C (SIGINT).
// Ensures in-flight messages finish, MongoDB is flushed, and the
// RabbitMQ channel is closed cleanly.
// ─────────────────────────────────────────────────────────────────────────────

const gracefulShutdown = async (signal) => {
  console.log(`\n⚠️  Received ${signal}. Initiating graceful shutdown...`);

  // 1. Stop accepting new HTTP requests
  server.close(() => {
    console.log('✅ HTTP server closed.');
  });

  try {
    // 2. Close the RabbitMQ channel — allows any in-progress consumer callbacks
    //    to complete before the channel is torn down
    const ch = getChannel();
    if (ch) {
      await ch.close();
      console.log('✅ RabbitMQ channel closed.');
    }

    // 3. Close the RabbitMQ connection
    const conn = getConnection();
    if (conn) {
      await conn.close();
      console.log('✅ RabbitMQ connection closed.');
    }

    // 4. Close MongoDB connection — flushes pending writes
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed.');

    console.log('🏁 Graceful shutdown complete. Goodbye!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err.message);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); // Docker stop
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));  // Ctrl+C

// Catch unhandled rejections to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Don't crash — log and continue; the DLQ handles message failure recovery
});
