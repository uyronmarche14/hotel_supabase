/**
 * Room Image Upload Middleware
 * Handles multipart/form-data file uploads for room images using multer
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
    fileSize: 5 * 1024 * 1024, // 5MB max file size
    files: 10 // Allow up to 10 files per request for multiple images
  }
});

// Middleware for handling single room image upload
const uploadRoomImage = upload.single('image');

// Middleware for handling multiple room image uploads
const uploadRoomImages = upload.array('images', 10);

// Error handler for multer errors
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return next(new AppError('File size exceeds the 5MB limit', 400));
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return next(new AppError('Too many files. Maximum is 10 images', 400));
    }
    return next(new AppError(`File upload error: ${err.message}`, 400));
  }
  
  // Pass other errors to the global error handler
  next(err);
};

module.exports = {
  uploadRoomImage,
  uploadRoomImages,
  handleMulterError
};
