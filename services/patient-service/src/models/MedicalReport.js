const mongoose = require('mongoose');

const medicalReportSchema = new mongoose.Schema({
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User', // Links this report directly to the Patient
    required: true
  },
  title: {
    type: String,
    required: [true, 'Please provide a title for this report (e.g., Blood Test Results)']
  },
  documentType: {
    type: String,
    enum: ['Blood Test', 'X-Ray', 'MRI', 'Prescription', 'General', 'Other'],
    default: 'General'
  },
  fileUrl: {
    type: String, // The secure HTTPS link to the file on Cloudinary
    required: true
  },
  cloudinaryId: {
    type: String, // We save this ID so we can delete the file from the cloud later if needed
    required: true
  },
  uploadedBy: {
    type: String,
    enum: ['patient', 'doctor'], // Tracks who uploaded it
    default: 'patient'
  }
}, {
  timestamps: true // Automatically adds 'createdAt' date
});

module.exports = mongoose.model('MedicalReport', medicalReportSchema);