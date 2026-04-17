const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 6,
    },
    phone: {
      type: String,
      trim: true,
    },
    specialty: {
      type: String,
      required: [true, "Specialty is required"],
      trim: true,
    },
    qualifications: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      min: 0,
      default: 0,
    },
    consultationFee: {
      type: Number,
      min: 0,
      default: 0,
    },
    clinicAddress: {
      type: String,
      trim: true,
    },
    bio: {
      type: String,
      trim: true,
    },
    languages: {
      type: [String],
      default: [],
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    profilePicture: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: hash password before saving
doctorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Instance method: compare plain password with hashed
doctorSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Instance method: return profile without sensitive fields
doctorSchema.methods.getPublicProfile = function () {
  const doc = this.toObject();
  delete doc.password;
  delete doc.__v;
  return doc;
};

module.exports = mongoose.model("Doctor", doctorSchema);
