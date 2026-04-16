// src/middleware/errorHandler.js
// Centralized Express error handler.
// Mounted LAST in src/app.js — catches anything that calls next(err).
//
// Handles:
//   ApiError     — typed business errors from services/controllers
//   Mongoose     — ValidationError, CastError (bad ObjectId), duplicate key (11000)
//   JsonWebToken — TokenExpiredError, JsonWebTokenError (from future real auth)
//   Generic      — any uncaught Error → 500

"use strict";

const { ApiError } = require("../utils/ApiError");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Always log the full error in development; abbreviated in production
  if (process.env.NODE_ENV === "development") {
    console.error("❌ [ErrorHandler]", err);
  } else {
    console.error(`❌ [ErrorHandler] ${err.name}: ${err.message}`);
  }

  // Already sent a response (e.g. in a stream) — can't send another
  if (res.headersSent) return;

  // ── ApiError (our own typed errors) ──────────────────────────────────────────
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // ── Mongoose: field-level validation errors ───────────────────────────────────
  if (err.name === "ValidationError") {
    const details = Object.values(err.errors).map((e) => ({
      field:   e.path,
      message: e.message,
    }));
    return res.status(400).json({
      success: false,
      message: "Validation failed.",
      details,
    });
  }

  // ── Mongoose: bad ObjectId format  ────────────────────────────────────────────
  if (err.name === "CastError" && err.kind === "ObjectId") {
    return res.status(400).json({
      success: false,
      message: `Invalid ID format: '${err.value}'.`,
    });
  }

  // ── Mongoose: duplicate unique key (E11000) ───────────────────────────────────
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || "field";
    return res.status(409).json({
      success: false,
      message: `Duplicate value for '${field}'. Please use a unique value.`,
    });
  }

  // ── JWT: token expired ────────────────────────────────────────────────────────
  if (err.name === "TokenExpiredError") {
    return res.status(401).json({
      success: false,
      message: "Session expired. Please login again.",
    });
  }

  // ── JWT: invalid token ────────────────────────────────────────────────────────
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token. Please login again.",
    });
  }

  // ── Fallback: unexpected server error ─────────────────────────────────────────
  return res.status(500).json({
    success: false,
    message: "Something went wrong. Please try again later.",
    ...(process.env.NODE_ENV === "development" && { debug: err.message }),
  });
};

module.exports = { errorHandler };
