const mongoose = require("mongoose");

const medicationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Medication name is required"],
      trim: true,
    },
    dosage: {
      type: String,
      trim: true,
    },
    frequency: {
      type: String,
      trim: true, // e.g., "Twice daily", "Every 8 hours"
    },
    duration: {
      type: String,
      trim: true, // e.g., "7 days", "2 weeks"
    },
    instructions: {
      type: String,
      trim: true, // e.g., "Take after meals"
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    patientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Patient ID is required"],
    },
    doctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Doctor",
      required: [true, "Doctor ID is required"],
    },
    appointmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      default: null,
    },
    diagnosis: {
      type: String,
      required: [true, "Diagnosis is required"],
      trim: true,
    },
    medications: {
      type: [medicationSchema],
      default: [],
    },
    notes: {
      type: String,
      trim: true,
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ doctorId: 1, patientId: 1 });
prescriptionSchema.index({ appointmentId: 1 });

module.exports = mongoose.model("Prescription", prescriptionSchema);
