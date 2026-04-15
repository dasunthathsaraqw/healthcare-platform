const mongoose = require("mongoose");

const appointmentSchema = new mongoose.Schema(
  {
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

    // ── Denormalised display names (avoid cross-service lookups on every read) ─
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

    // ── Scheduling ────────────────────────────────────────────────────────────
    dateTime: {
      type: Date,
      required: [true, "Appointment date and time is required"],
      index: true,
    },
    reason: {
      type: String,
      trim: true,
      maxlength: [500, "Reason cannot exceed 500 characters"],
      default: "",
    },
    notes: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Status lifecycle: pending → confirmed → completed | cancelled | rejected
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Video consultation ─────────────────────────────────────────────────────
    meetingLink: {
      type: String,
      default: "",
    },

    // ── Payment linkage ────────────────────────────────────────────────────────
    paymentStatus: {
      type: String,
      enum: ["unpaid", "paid", "refunded"],
      default: "unpaid",
    },
    paymentId: {
      type: String,
      default: null,
    },
    consultationFee: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for common query patterns
appointmentSchema.index({ patientId: 1, dateTime: 1 });
appointmentSchema.index({ doctorId: 1, dateTime: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });

module.exports = mongoose.model("Appointment", appointmentSchema);
