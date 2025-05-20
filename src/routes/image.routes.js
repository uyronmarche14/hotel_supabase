/**
 * Image Routes
 * Routes for image operations and Cloudinary functionality
 */

const express = require('express');
const { verifyToken, restrictTo } = require('../middleware/auth.middleware');
const cloudinaryController = require('../controllers/image/cloudinary-controller');

const router = express.Router();

// Protect all routes
router.use(verifyToken);

// Cloudinary image operations
router.delete('/cloudinary/delete', cloudinaryController.deleteCloudinaryImage);
router.post('/cloudinary/transform', cloudinaryController.transformCloudinaryImage);
router.get('/cloudinary/info', cloudinaryController.getCloudinaryImageInfo);

module.exports = router;
