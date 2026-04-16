// src/utils/ApiError.js
// Custom error class for the telemedicine-service.
//
// Usage in services/controllers:
//   const { ApiError } = require("../utils/ApiError");
//   throw new ApiError(404, "Session not found.");
//   throw new ApiError(422, "Appointment is not CONFIRMED.", { appointmentStatus: "PENDING" });
//
// The centralized errorHandler.js reads `.statusCode` and `.details`
// to build a consistent JSON response automatically.

"use strict";

class ApiError extends Error {
  /**
   * @param {number} statusCode  - HTTP status code (400, 401, 403, 404, 409, 422, 500…)
   * @param {string} message     - Human-readable error description
   * @param {*}      [details]   - Optional extra context (validation errors, field names, etc.)
   */
  constructor(statusCode, message, details = null) {
    super(message);
    this.name       = "ApiError";
    this.statusCode = statusCode;
    this.details    = details;
    // Preserve original stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  // ── Factory helpers — readable, consistent call-sites ────────────────────────
  static badRequest(message, details)   { return new ApiError(400, message, details); }
  static unauthorized(message)          { return new ApiError(401, message || "Unauthorized"); }
  static forbidden(message)             { return new ApiError(403, message || "Forbidden"); }
  static notFound(resource = "Resource"){ return new ApiError(404, `${resource} not found.`); }
  static conflict(message, details)     { return new ApiError(409, message, details); }
  static unprocessable(message, details){ return new ApiError(422, message, details); }
  static internal(message)              { return new ApiError(500, message || "Internal server error"); }
}

module.exports = { ApiError };
