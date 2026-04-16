// src/config/db.js
// Exported for use if you ever want to initialise the DB connection
// from a dedicated module instead of server.js directly.
// Currently server.js handles the connection; this file is a clean
// extension point for future refactoring (e.g. adding connection options).

const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    // MONGODB_URI  — local dev / .env.example canonical name
    // DB_URL       — Docker Compose injected name (backward-compat)
    const DB_URL =
      process.env.MONGODB_URI ||
      process.env.DB_URL ||
      "mongodb://telemedicine-db:27017/telemedicinedb";

    const conn = await mongoose.connect(DB_URL, {
      // Recommended options for production resilience
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(
      `✅ Telemedicine Service: MongoDB connected → ${conn.connection.host}`
    );

    mongoose.connection.on("error", (err) => {
      console.error("❌ MongoDB runtime error:", err.message);
    });

    mongoose.connection.on("disconnected", () => {
      console.warn("⚠️  MongoDB disconnected — attempting reconnect...");
    });
  } catch (error) {
    console.error(
      "❌ Telemedicine Service: MongoDB connection failed:",
      error.message
    );
    process.exit(1); // Exit hard — service cannot run without DB
  }
};

module.exports = { connectDB };
