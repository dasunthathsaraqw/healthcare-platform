// src/models/Session.js
// Mongoose schema for a telemedicine video consultation session.
// A Session is created when a confirmed appointment begins a video call.
// It tracks the full lifecycle: scheduled → active → ended | cancelled.

const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    // ── Appointment linkage ────────────────────────────────────────────────────
    appointmentId: {
      type: String,
      required: [true, "Appointment ID is required"],
      index: true,
    },

    // ── Participants ───────────────────────────────────────────────────────────
    patientId: {
      type: String,
      required: [true, "Patient ID is required"],
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, "Doctor ID is required"],
      index: true,
    },

    // ── Denormalised display names (avoids cross-service lookups on reads) ─────
    patientName: {
      type: String,
      default: "",
    },
    doctorName: {
      type: String,
      default: "",
    },
    specialty: {
      type: String,
      default: "",
    },

    // ── Video room ─────────────────────────────────────────────────────────────
    roomName: {
      type: String,
      required: [true, "Room name is required"],
      unique: true,
      index: true,
    },
    meetingLink: {
      type: String,
      default: "",
    },

    // ── Session lifecycle: scheduled → active → ended | cancelled ──────────────
    status: {
      type: String,
      enum: ["scheduled", "active", "ended", "cancelled"],
      default: "scheduled",
      index: true,
    },

    // ── Timing ─────────────────────────────────────────────────────────────────
    scheduledAt: {
      type: Date,
      required: [true, "Scheduled time is required"],
      index: true,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    endedAt: {
      type: Date,
      default: null,
    },

    // ── Duration (minutes) — computed when session ends ────────────────────────
    durationMinutes: {
      type: Number,
      default: null,
      min: 0,
    },

    // ── Clinical notes added by doctor during / after session ─────────────────
    doctorNotes: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Cancellation ──────────────────────────────────────────────────────────
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Participant join tracking ──────────────────────────────────────────────
    patientJoined: {
      type: Boolean,
      default: false,
    },
    doctorJoined: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt, updatedAt
  }
);

// ── Compound indexes for common query patterns ─────────────────────────────────
sessionSchema.index({ patientId: 1, scheduledAt: -1 });
sessionSchema.index({ doctorId: 1, scheduledAt: -1 });
sessionSchema.index({ doctorId: 1, status: 1 });
sessionSchema.index({ appointmentId: 1 }, { unique: true });

module.exports = mongoose.model("Session", sessionSchema);
