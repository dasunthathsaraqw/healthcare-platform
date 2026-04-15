const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    patientId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    doctorId: {
      type: String,
      required: true,
      trim: true,
      index: true
    },
    roomId: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    sessionUrl: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["scheduled", "active", "completed", "cancelled"],
      default: "scheduled"
    },
    scheduledAt: {
      type: Date,
      required: true
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
