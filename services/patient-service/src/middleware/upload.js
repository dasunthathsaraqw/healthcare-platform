const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');
const dotenv = require('dotenv');

dotenv.config();

const requiredCloudinaryVars = [
  'CLOUDINARY_CLOUD_NAME',
  'CLOUDINARY_API_KEY',
  'CLOUDINARY_API_SECRET',
];

const missingCloudinaryVars = requiredCloudinaryVars.filter(
  (name) => !process.env[name]
);

if (missingCloudinaryVars.length > 0) {
  console.error(
    `[Upload] Missing Cloudinary environment variables: ${missingCloudinaryVars.join(', ')}`
  );
} else {
  console.log(
    `[Upload] Cloudinary environment loaded for cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`
  );
}

// 1. Configure Cloudinary with our secure environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

console.log(
  `[Upload] Cloudinary config applied. cloud_name=${process.env.CLOUDINARY_CLOUD_NAME || 'MISSING'}`
);

// 2. Set up the Storage Engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    try {
      console.log(
        `[Upload] Preparing Cloudinary upload for file=${file.originalname}, mimetype=${file.mimetype}`
      );

      if (missingCloudinaryVars.length > 0) {
        throw new Error(
          `Cloudinary is not configured. Missing: ${missingCloudinaryVars.join(', ')}`
        );
      }

      // We allow standard image formats and PDFs for medical reports
      return {
        folder: 'healthcare_patient_reports', // This creates a neat folder in your Cloudinary dashboard
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf'],
        resource_type: 'auto', // 'auto' is crucial so it accepts raw files like PDFs, not just images
      };
    } catch (error) {
      console.error('[Upload] Cloudinary storage params error:', error.message);
      throw error;
    }
  },
});

// 3. Initialize Multer with our Cloudinary storage engine
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit for security
});

module.exports = upload;