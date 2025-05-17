const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Validation middleware
const registerValidation = [
  body('name').notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
];

const loginValidation = [
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').notEmpty().withMessage('Password is required')
];

// Routes - matching the old backend structure
// Register a new user
router.post('/register', registerValidation, authController.register);

// Login user
router.post('/login', loginValidation, authController.login);

// Admin login
router.post('/admin-login', loginValidation, authController.adminLogin);

// Protected routes (require authentication)
// Get user data
router.get('/me', authMiddleware.verifyToken, authController.getCurrentUser);

// Update user profile
router.put('/profile', authMiddleware.verifyToken, authController.updateUserProfile);

// Refresh token endpoint
router.post('/refresh-token', authController.refreshToken);

// Forgot password
router.post('/forgot-password', body('email').isEmail(), authController.forgotPassword);

// Reset password
router.post('/reset-password', authController.resetPassword);

// Logout
router.post('/logout', authMiddleware.verifyToken, authController.logout);

module.exports = router;
