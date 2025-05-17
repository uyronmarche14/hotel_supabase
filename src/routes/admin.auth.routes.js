/**
 * Admin Authentication Routes
 * Handles admin-specific authentication endpoints
 */

const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Admin login validation
const loginValidation = [
  body('email').isEmail().withMessage('Please provide a valid email'),
  body('password').notEmpty().withMessage('Password is required')
];

// Admin login
router.post('/login', loginValidation, authController.adminLogin);

// Admin logout
router.get('/logout', authController.logout);

// Get current admin profile
router.get('/profile', 
  authMiddleware.verifyToken,
  authMiddleware.isAdmin,
  authController.getCurrentUser
);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Admin authentication service is running' });
});

module.exports = router;
