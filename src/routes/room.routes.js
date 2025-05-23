const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/room.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { uploadRoomImage, uploadRoomImages, handleMulterError } = require('../middleware/roomUpload.middleware');

const router = express.Router();

// Public routes for rooms
// GET all rooms with pagination
router.get('/', roomController.getAllRooms);

// GET top rated rooms
router.get('/top-rated', roomController.getTopRatedRooms);

// GET room categories samples (one from each category)
router.get('/categories/samples', roomController.getCategorySamples);

// GET all room categories
router.get('/categories', roomController.getRoomCategories);

// GET search rooms
router.get('/search', roomController.searchRooms);

// GET rooms by category
router.get('/category/:category', roomController.getRoomsByCategory);

// GET check room availability
router.get('/:id/availability', roomController.checkRoomAvailability);

// GET a single room by ID
router.get('/:id', roomController.getRoomById);

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

// Protected routes (admin only)
// POST create a new room
router.post('/',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  uploadRoomImages,
  handleMulterError,
  roomValidation,
  roomController.createRoom
);

// PUT update room details
router.put('/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  roomValidation,
  roomController.updateRoom
);

// POST upload room image
router.post('/:id/image',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  uploadRoomImage,
  handleMulterError,
  roomController.uploadRoomImage
);

// POST upload multiple room images
router.post('/:id/images',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  uploadRoomImages,
  handleMulterError,
  roomController.uploadRoomImages
);

// DELETE a room
router.delete('/:id',
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  roomController.deleteRoom
);

module.exports = router;
