const mongoose = require("mongoose");
const { ROLES } = require("../constants/roles");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
      maxlength: [100, "Name cannot exceed 100 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
    },
    role: {
      type: String,
      enum: Object.values(ROLES),
      default: ROLES.PATIENT,
      required: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    // Patient specific fields
    dateOfBirth: {
      type: Date,
    },
    address: {
      street: String,
      city: String,
      country: String,
    },
    medicalHistory: [String],
    // Doctor specific fields
    specialty: {
      type: String,
    },
    qualifications: [String],
    experience: {
      type: Number,
      default: 0,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Admin specific fields
    permissions: [String],
  },
  {
    timestamps: true,
  },
);

// REMOVE the pre-save hook entirely
// No more userSchema.pre("save", ...)

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require("bcryptjs");
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to check if user has permission
userSchema.methods.hasPermission = function (permission) {
  const { PERMISSIONS } = require("../constants/roles");
  const userPermissions = PERMISSIONS[this.role] || [];
  return userPermissions.includes(permission);
};

// Method to get public profile (exclude sensitive data)
userSchema.methods.getPublicProfile = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.__v;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
