/**
 * Admin Room Management Routes
 * Handles admin-specific room management endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/room.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { uploadRoomImage, uploadRoomImages, handleMulterError } = require('../middleware/roomUpload.middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// Validation middleware for room creation/update
const roomValidation = [
  body('title').notEmpty().withMessage('Title is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('price').isNumeric().withMessage('Price must be a number'),
  body('capacity').isNumeric().withMessage('Capacity must be a number'),
  body('size').isNumeric().withMessage('Size must be a number'),
  body('category').notEmpty().withMessage('Category is required'),
  body('location').notEmpty().withMessage('Location is required')
];

// Get all rooms with admin details
router.get('/', roomController.getAllRooms);

// Create a new room
router.post('/',
  uploadRoomImages,  // This middleware handles 'images' field in multipart/form-data
  handleMulterError, // Handle any Multer-specific errors
  (req, res, next) => {
    // Debug middleware to log file upload details
    console.log('Multer middleware processed files:', req.files ? req.files.length : 'none');
    if (req.files && req.files.length > 0) {
      console.log('Files received:', req.files.map(f => f.originalname));
    }
    next();
  },
  roomValidation,
  roomController.createRoom
);

// Update room details
router.put('/:id',
  roomValidation,
  roomController.updateRoom
);

// Upload room image
router.post('/:id/image',
  uploadRoomImage,
  handleMulterError,
  roomController.uploadRoomImage
);

// Upload multiple room images
router.post('/:id/images',
  uploadRoomImages,
  handleMulterError,
  roomController.uploadRoomImages
);

// Delete a room
router.delete('/:id', roomController.deleteRoom);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Admin room management service is running' });
});

module.exports = router;
