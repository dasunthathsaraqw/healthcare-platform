const mongoose = require("mongoose");

const patientMockSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: String,
    phone: String,
    dob: Date,
    gender: String,
    bloodGroup: String,
    address: String,
    medicalHistory: [String],
    allergies: [String],
    emergencyContact: String,
    profilePicture: String,
  },
  { timestamps: true }
);

module.exports = mongoose.model("PatientMock", patientMockSchema, "patientmocks");
