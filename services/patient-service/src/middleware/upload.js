const cloudinary = require('cloudinary').v2;
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
  timeout: 10000, // Important to prevent hangs when external networking fails
});

console.log(
  `[Upload] Cloudinary config applied. cloud_name=${process.env.CLOUDINARY_CLOUD_NAME || 'MISSING'}`
);

// 2. Keep files in memory and upload manually from the controller.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit for security
});

module.exports = upload;
module.exports.cloudinary = cloudinary;