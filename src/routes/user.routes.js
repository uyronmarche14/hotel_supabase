const express = require('express');
const { body } = require('express-validator');
const userController = require('../controllers/user.controller');
const authMiddleware = require('../middleware/auth.middleware');
const { uploadProfilePicture, handleMulterError } = require('../middleware/upload.middleware');

const router = express.Router();

// All user routes require authentication
router.use(authMiddleware.verifyToken);

// GET all users - matching the old backend structure
router.get('/', userController.getAllUsers);

// GET user by ID
router.get('/:id', userController.getUserById);

// UPDATE user
router.put('/:id', userController.updateUser);

// DELETE user
router.delete('/:id', userController.deleteUser);

// User profile routes - these are handled in auth routes in the old backend
// but we'll keep them here for better organization
router.get('/profile', userController.getUserProfile);

// Change password route
router.put('/change-password', [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  body('confirmPassword').custom((value, { req }) => {
    if (value !== req.body.newPassword) {
      throw new Error('Password confirmation does not match new password');
    }
    return true;
  })
], userController.changePassword);

module.exports = router;
