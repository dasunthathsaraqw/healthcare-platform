const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// MongoDB Connection
mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("--Appointment Service: Connected to MongoDB--"))
  .catch((err) =>
    console.error("Appointment Service: MongoDB connection error:", err),
  );

// Health Check
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "appointment-service",
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use("/api/appointments", require("./src/routes/appointmentRouter-auth"));

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: "Something went wrong!",
    message: err.message,
  });
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`--Appointment Service running on port ${PORT}--`);
});
