const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema(
  {
    appointmentId: {
      type: String,
      required: true,
      unique: true,
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
    joinUrl: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ["CREATED", "ACTIVE", "ENDED", "CANCELLED"],
      default: "CREATED"
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
    },
    createdBy: {
      type: String,
      default: "system",
      trim: true
    },
    notes: {
      type: String,
      default: "",
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
