/**
 * File Upload Middleware
 * Handles multipart/form-data file uploads using multer
 */

const multer = require('multer');
const AppError = require('../utils/appError');

// Configure memory storage (files stored as Buffer objects)
const storage = multer.memoryStorage();

// File filter for images only
const imageFilter = (req, file, cb) => {
  // Accept only image files
  if (!file.mimetype.startsWith('image/')) {
    return cb(new AppError('Only image files are allowed', 400), false);
  }
  
  // Check file size (handled by limits in multer config)
  cb(null, true);
};

// Configure multer
const upload = multer({
  storage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max file size
    files: 1 // Only allow 1 file per request
  }
});

// Middleware for handling profile picture uploads
const uploadProfilePicture = upload.single('profilePic');

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the 2MB limit', 400));
    }
    return next(new AppError(`File upload error: ${err.message}`, 400));
  }
  
  // Pass other errors to the global error handler
  next(err);
};

module.exports = {
  uploadProfilePicture,
  handleMulterError
};
