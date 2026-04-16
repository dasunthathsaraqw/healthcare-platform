// src/models/ChatMessage.js
// Stores chat messages between doctor and patient for a specific appointment session.

"use strict";

const mongoose = require("mongoose");

const chatMessageSchema = new mongoose.Schema(
  {
    // Link to the appointment (used as the "room" key)
    appointmentId: {
      type: String,
      required: [true, "Appointment ID is required"],
      index: true,
    },

    // Sender identity
    senderId: {
      type: String,
      required: [true, "Sender ID is required"],
    },
    senderName: {
      type: String,
      default: "Unknown",
    },
    senderRole: {
      type: String,
      enum: ["patient", "doctor", "admin"],
      required: true,
    },

    // Message content
    message: {
      type: String,
      required: [true, "Message text is required"],
      trim: true,
      maxlength: [2000, "Message cannot exceed 2000 characters"],
    },

    // Read receipt
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true, // createdAt = message sent time
  }
);

// Index for fast room-based queries (all messages for an appointment, ordered by time)
chatMessageSchema.index({ appointmentId: 1, createdAt: 1 });

module.exports = mongoose.model("ChatMessage", chatMessageSchema);
