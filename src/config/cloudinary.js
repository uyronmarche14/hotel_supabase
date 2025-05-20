/**
 * Cloudinary Configuration
 * Set up Cloudinary SDK with environment variables
 */

const cloudinary = require('cloudinary').v2;

// Initialize cloudinary with environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

module.exports = cloudinary;
