const mongoose = require("mongoose");

const appointmentMockSchema = new mongoose.Schema(
  {
    doctorId: { type: mongoose.Schema.Types.ObjectId, required: true },
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: "PatientMock", required: true },
    dateTime: { type: Date, required: true },
    status: {
      type: String,
      enum: ["pending", "confirmed", "completed", "cancelled", "rejected"],
      default: "pending",
    },
    type: { type: String, enum: ["in-person", "video"], default: "in-person" },
    reason: String,
    rejectionReason: String,
    notes: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("AppointmentMock", appointmentMockSchema, "appointmentmocks");
