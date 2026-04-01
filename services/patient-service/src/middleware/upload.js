const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

// 1. Configure Cloudinary with our secure environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// 2. Set up the Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    // We allow standard image formats and PDFs for medical reports
    return {
      folder: 'healthcare_patient_reports', // This creates a neat folder in your Cloudinary dashboard
      allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
      resource_type: 'auto', // 'auto' is crucial so it accepts raw files like PDFs, not just images
    };
  },
});

// 3. Initialize Multer with our Cloudinary storage engine
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit for security
});

module.exports = upload;