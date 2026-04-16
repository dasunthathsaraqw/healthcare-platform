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

    // ── Denormalised display names ──────────────────────────────────────────
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

    // ── Status lifecycle ──────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rejected","cancellation_requested"],
      default: "pending",
      index: true,
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
    },
    cancellationReason: {
      type: String,
      trim: true,
      default: "",
    },

    // ── Guest Booking ────────────────────────────────────────────────────────
    isForSomeoneElse: {
      type: Boolean,
      default: false,
    },
    bookedFor: {
      name:  { type: String, default: "" },
      age:   { type: Number, default: null },
      phone: { type: String, default: "" },
      email: { type: String, default: "" },
    },

    // ── Sequencing ────────────────────────────────────────────────────────────
    patientNumber: {
      type: Number,
      default: 1,
      index: true,
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

    // ── NEW: Slot management fields ───────────────────────────────────────────
    availabilityId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Availability",
      default: null,
      index: true,
    },
    slotTime: {
      type: String,
      default: null,
    },
    slotPosition: {
      type: Number,
      default: null,
    },
    refundRequested: { type: Boolean, default: false },
    refundAmount: { type: Number, default: null },
    refundRequestedAt: { type: Date, default: null },
    refundProcessedBy: { type: String, default: null },
    refundProcessedAt: { type: Date, default: null },
    adminNotes: { type: String, default: null }
  },
  {
    timestamps: true,
  }
);

// Compound index for common query patterns
appointmentSchema.index({ patientId: 1, dateTime: 1 });
appointmentSchema.index({ doctorId: 1, dateTime: 1 });
appointmentSchema.index({ doctorId: 1, status: 1 });
//appointmentSchema.index({ availabilityId: 1 }); // NEW index

module.exports = mongoose.model("Appointment", appointmentSchema);