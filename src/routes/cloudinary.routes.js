/**
 * Cloudinary Routes
 * Handles specialized Cloudinary operations like signature generation
 */

const express = require('express');
const router = express.Router();
const { verifyToken } = require('../middleware/auth.middleware');
const cloudinaryController = require('../controllers/image/cloudinary-controller');

// Generate a signed upload URL (secured with authentication)
router.get('/signature', verifyToken, cloudinaryController.generateSignature);

// Synchronize image information with the database after direct upload
router.post('/sync/:entityType/:id', verifyToken, cloudinaryController.syncImage);

// Test Cloudinary configuration
router.get('/test', cloudinaryController.testConnection);

// Delete an image from Cloudinary
router.delete('/delete', verifyToken, cloudinaryController.deleteCloudinaryImage);

module.exports = router;
