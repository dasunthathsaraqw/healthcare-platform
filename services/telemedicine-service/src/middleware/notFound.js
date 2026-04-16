// src/middleware/notFound.js
// 404 handler — mounted AFTER all real routes, BEFORE errorHandler in app.js.
// Returns a consistent JSON shape so the frontend always gets structured errors.

"use strict";

const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    hint:    "Check the API reference at GET /",
  });
};

module.exports = { notFound };
