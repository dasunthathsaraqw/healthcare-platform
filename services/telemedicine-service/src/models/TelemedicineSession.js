// src/models/TelemedicineSession.js
// Mongoose schema for a telemedicine video consultation session.
//
// Lifecycle:  SCHEDULED → ACTIVE → ENDED
//                              ↘ CANCELLED  (from any non-terminal state)
//
// The `channelName` field is the Agora RTC channel identifier.
// Agora tokens are generated on-demand (NOT stored here) using
// src/services/agora.service.js — so the token is never persisted.

"use strict";

const mongoose = require("mongoose");

// ── Status enum ────────────────────────────────────────────────────────────────
// Uppercase to match Agora/industry convention and be clearly distinct
// from appointment-service lowercase statuses.
const SESSION_STATUS = {
  SCHEDULED: "SCHEDULED",
  ACTIVE:    "ACTIVE",
  ENDED:     "ENDED",
  CANCELLED: "CANCELLED",
};

const telemedicineSessionSchema = new mongoose.Schema(
  {
    // ── Appointment linkage ──────────────────────────────────────────────────
    // References the appointment in appointment-service (stored as string,
    // not ObjectId, because it lives in a separate DB).
    // Unique: one session per confirmed appointment.
    appointmentId: {
      type:     String,
      required: [true, "Appointment ID is required"],
      unique:   true,
      index:    true,
    },

    // ── Participants ─────────────────────────────────────────────────────────
    patientId: {
      type:     String,
      required: [true, "Patient ID is required"],
      index:    true,
    },
    doctorId: {
      type:     String,
      required: [true, "Doctor ID is required"],
      index:    true,
    },

    // ── Denormalised display names ────────────────────────────────────────────
    // Avoids cross-service lookups on every read. Populated at session creation
    // from appointment data (real or mock).
    patientName: { type: String, default: "" },
    doctorName:  { type: String, default: "" },
    specialty:   { type: String, default: "" },

    // ── Agora video channel ───────────────────────────────────────────────────
    // channelName is passed to the frontend; the frontend initialises the Agora
    // RTC client with this value. Tokens are generated separately per-request.
    channelName: {
      type:     String,
      required: [true, "Channel name is required"],
      unique:   true,
      index:    true,
    },

    // ── Session lifecycle ─────────────────────────────────────────────────────
    status: {
      type:    String,
      enum:    Object.values(SESSION_STATUS),
      default: SESSION_STATUS.SCHEDULED,
      index:   true,
    },

    // ── Timing ───────────────────────────────────────────────────────────────
    scheduledAt: {
      type:     Date,
      required: [true, "Scheduled time is required"],
      index:    true,
    },
    startedAt: {
      // Set when first participant joins (status → ACTIVE)
      type:    Date,
      default: null,
    },
    endedAt: {
      // Set when session is ended (status → ENDED)
      type:    Date,
      default: null,
    },

    // ── Duration ─────────────────────────────────────────────────────────────
    // Computed on end: Math.round((endedAt - startedAt) / 60000)
    durationMinutes: {
      type:    Number,
      default: null,
      min:     0,
    },

    // ── Participation tracking ────────────────────────────────────────────────
    // Used by the frontend to show "waiting for doctor/patient" state.
    patientJoined: { type: Boolean, default: false },
    doctorJoined:  { type: Boolean, default: false },

    // ── Session creator ───────────────────────────────────────────────────────
    // The userId (patient or doctor) who initiated session creation.
    // Useful for audit logs and access-control checks.
    createdBy: {
      type:  String,
      default: "",
    },

    // ── Clinical notes ────────────────────────────────────────────────────────
    // Written by the doctor during or after the session.
    // Intentionally plain text for now; upgrade to structured SOAP notes later.
    notes: {
      type:    String,
      trim:    true,
      default: "",
      maxlength: [5000, "Notes cannot exceed 5000 characters"],
    },

    // ── Cancellation ─────────────────────────────────────────────────────────
    cancellationReason: {
      type:    String,
      trim:    true,
      default: "",
    },
  },
  {
    timestamps: true, // adds createdAt + updatedAt automatically
  }
);

// ── Compound indexes for common query patterns ─────────────────────────────────
telemedicineSessionSchema.index({ patientId: 1, scheduledAt: -1 });
telemedicineSessionSchema.index({ doctorId: 1, scheduledAt: -1 });
telemedicineSessionSchema.index({ doctorId: 1, status: 1 });
telemedicineSessionSchema.index({ status: 1, scheduledAt: 1 });

// ── Export status enum alongside model for use in services/controllers ─────────
telemedicineSessionSchema.statics.STATUS = SESSION_STATUS;

const TelemedicineSession = mongoose.model(
  "TelemedicineSession",
  telemedicineSessionSchema
);

module.exports = { TelemedicineSession, SESSION_STATUS };
