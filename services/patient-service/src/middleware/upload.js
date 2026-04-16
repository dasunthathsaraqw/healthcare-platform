const cloudinary = require('cloudinary').v2;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Validate environment
const requiredVars = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(`❌ [Upload] Missing Cloudinary env vars: ${missingVars.join(', ')}`);
} else {
  console.log(`✅ [Upload] Cloudinary env loaded for cloud: ${process.env.CLOUDINARY_CLOUD_NAME}`);
}

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  timeout: 30000,
  secure: true,
});

// Test Cloudinary connection
if (process.env.CLOUDINARY_CLOUD_NAME) {
  cloudinary.api.ping()
    .then(result => console.log(`✅ [Upload] Cloudinary ping: ${result.status}`))
    .catch(err => console.error(`❌ [Upload] Cloudinary ping failed: ${err.message}`));
}

// Choose storage based on environment variable
const STORAGE_TYPE = process.env.STORAGE_TYPE || 'local'; // 'local' or 'cloudinary'

let storage;
if (STORAGE_TYPE === 'local') {
  const uploadDir = path.join(__dirname, '../../uploads');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const unique = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, unique + ext);
    }
  });
  console.log(`✅ [Upload] Using LOCAL storage at ${uploadDir}`);
} else {
  storage = multer.memoryStorage();
  console.log(`✅ [Upload] Using CLOUDINARY storage (memory)`);
}

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

module.exports = upload;
module.exports.cloudinary = cloudinary;
module.exports.STORAGE_TYPE = STORAGE_TYPE;