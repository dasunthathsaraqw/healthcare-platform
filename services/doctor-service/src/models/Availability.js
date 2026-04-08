const mongoose = require("mongoose");

const availabilitySchema = new mongoose.Schema(
  {
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor ID is required"],
    },
    // 0=Sunday, 1=Monday, ..., 6=Saturday (used for recurring slots)
    dayOfWeek: {
      type: Number,
      min: 0,
      max: 6,
      default: null,
    },
    // For one-time / specific date availability
    specificDate: {
      type: Date,
      default: null,
    },
    startTime: {
      type: String,
      required: [true, "Start time is required"],
      match: [/^\d{2}:\d{2}$/, "Start time must be in HH:MM format"],
    },
    endTime: {
      type: String,
      required: [true, "End time is required"],
      match: [/^\d{2}:\d{2}$/, "End time must be in HH:MM format"],
    },
    slotDuration: {
      type: Number,
      default: 30, // minutes
      min: 5,
    },
    isRecurring: {
      type: Boolean,
      default: true,
    },
    isBooked: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["available", "booked", "unavailable"],
      default: "available",
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for fast lookup
availabilitySchema.index({ doctorId: 1, dayOfWeek: 1 });
availabilitySchema.index({ doctorId: 1, specificDate: 1 });

module.exports = mongoose.model("Availability", availabilitySchema);
