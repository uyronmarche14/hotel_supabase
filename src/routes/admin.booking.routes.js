/**
 * Admin Booking Routes
 * These routes are only accessible to admin users
 */

const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');
const bookingMiddleware = require('../middleware/booking.middleware');

const router = express.Router();

// All admin routes require authentication and admin role
router.use(authMiddleware.verifyToken);
router.use(authMiddleware.isAdmin);

// Get all bookings with pagination
router.get('/', bookingController.getAllBookings);

// Update booking status with validation
router.put('/:id/status', bookingMiddleware.validateStatusUpdate, bookingController.updateBookingStatus);

// Get a specific booking by ID
router.get('/:id', bookingController.getBookingById);

// Cancel a booking
router.put('/:id/cancel', bookingController.cancelBooking);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Admin booking service is running' });
});

module.exports = router;
