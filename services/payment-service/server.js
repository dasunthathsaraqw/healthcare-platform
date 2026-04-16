const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3004;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // PayHere sends urlencoded POST

mongoose
  .connect(process.env.DB_URL)
  .then(() => console.log("--Payment Service: Connected to MongoDB--"))
  .catch((err) => console.error("Payment Service: MongoDB error:", err));

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "OK",
    service: "payment-service",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/payments", require("./src/routes/paymentRoutes-auth"));

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Something went wrong!", message: err.message });
});

app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

app.listen(PORT, () => {
  console.log(`--Payment Service running on port ${PORT}--`);
  console.log(`--Notify URL: ${process.env.PAYHERE_NOTIFY_URL}--`);
});