const mongoose = require("mongoose");
const User = require("./User");
const { USER_ROLES } = require("../utils/constants");

/**
 * Doctor Schema - Extends User model
 * Contains doctor-specific fields
 */
const doctorSchema = new mongoose.Schema(
  {
    specialty: {
      type: String,
      required: [true, "Specialty is required for doctors"],
      enum: [
        "Cardiology",
        "Dermatology",
        "Neurology",
        "Pediatrics",
        "Psychiatry",
        "Orthopedics",
        "General Medicine",
        "Gynecology",
        "Ophthalmology",
        "ENT",
        "Dentistry",
        "Other",
      ],
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    experience: {
      type: Number,
      default: 0,
      min: 0,
    },
    licenseNumber: {
      type: String,
      required: [true, "License number is required"],
      unique: true,
    },
    consultationFee: {
      type: Number,
      required: [true, "Consultation fee is required"],
      min: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verificationDocuments: [
      {
        type: String,
        url: String,
        uploadedAt: Date,
      },
    ],
    ratings: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      count: {
        type: Number,
        default: 0,
      },
    },
    languages: [
      {
        type: String,
      },
    ],
    bio: {
      type: String,
      maxlength: 500,
    },
    clinicAddress: {
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
    },
  },
  {
    timestamps: true,
  },
);

// Set default role for Doctor
doctorSchema.pre("save", function (next) {
  this.role = USER_ROLES.DOCTOR;
  next();
});

const Doctor = User.discriminator("Doctor", doctorSchema);

module.exports = Doctor;
