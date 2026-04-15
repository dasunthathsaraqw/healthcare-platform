const express = require("express");
const cors = require("cors");

const sessionRoutes = require("./routes/session.routes");
const notFoundHandler = require("./middleware/not-found.middleware");
const errorHandler = require("./middleware/error.middleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Telemedicine service is running."
  });
});

app.use("/api/sessions", sessionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
