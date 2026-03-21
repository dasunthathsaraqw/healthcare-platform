const mongoose = require("mongoose");
const User = require("./User");
const { USER_ROLES } = require("../utils/constants");

/**
 * Patient Schema - Extends User model
 * Contains patient-specific fields
 */
const patientSchema = new mongoose.Schema(
  {
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
    emergencyContact: {
      name: String,
      phone: String,
      relationship: String,
    },
    bloodType: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", null],
      default: null,
    },
    allergies: [
      {
        type: String,
      },
    ],
    chronicConditions: [
      {
        type: String,
      },
    ],
    medicalHistory: [
      {
        condition: String,
        diagnosedDate: Date,
        notes: String,
      },
    ],
    profilePicture: {
      type: String,
      default: null,
    },
    insuranceInfo: {
      provider: String,
      policyNumber: String,
      validUntil: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Set default role for Patient
patientSchema.pre("save", function (next) {
  this.role = USER_ROLES.PATIENT;
  next();
});

const Patient = User.discriminator("Patient", patientSchema);

module.exports = Patient;
