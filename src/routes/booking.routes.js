const express = require('express');
const { body } = require('express-validator');
const bookingController = require('../controllers/booking.controller');
const authMiddleware = require('../middleware/auth.middleware');
const bookingMiddleware = require('../middleware/booking.middleware');
const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');

const router = express.Router();

// Public route for checking availability
router.get('/check-availability', bookingMiddleware.validateCheckAvailability, bookingController.checkRoomAvailability);

// All other booking routes require authentication
router.use(authMiddleware.verifyToken);

// Create a new booking with validation
router.post('/', bookingMiddleware.validateCreateBooking, bookingController.createBooking);

// Get all bookings (optionally filtered by email)
router.get('/', bookingController.getUserBookings);

// Get booking summary (counts of upcoming and past bookings)
router.get('/summary', async (req, res, next) => {
  try {
    const userId = req.user.id;
    const today = new Date().toISOString().split('T')[0];
    
    // Get upcoming bookings count
    const { count: upcomingCount, error: upcomingError } = await supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('check_in', today)
      .not('status', 'eq', 'cancelled');
    
    if (upcomingError) {
      return next(new AppError(upcomingError.message, 500));
    }
    
    // Get past bookings count
    const { count: pastCount, error: pastError } = await supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .lt('check_out', today)
      .not('status', 'eq', 'cancelled');
    
    if (pastError) {
      return next(new AppError(pastError.message, 500));
    }
    
    // Get cancelled bookings count
    const { count: cancelledCount, error: cancelledError } = await supabaseClient
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('status', 'cancelled');
    
    if (cancelledError) {
      return next(new AppError(cancelledError.message, 500));
    }
    
    res.status(200).json({
      success: true,
      summary: {
        upcoming: upcomingCount || 0,
        past: pastCount || 0,
        cancelled: cancelledCount || 0,
        total: (upcomingCount || 0) + (pastCount || 0) + (cancelledCount || 0)
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// Get booking history with stats - accessible to authenticated users
router.get('/history', bookingController.getBookingHistory);

// Get booking history for a specific user
router.get('/history/:email', bookingController.getUserBookingHistory);

// Get a specific booking by ID
router.get('/:id', bookingController.getBookingById);

// Cancel a booking
router.put('/:id/cancel', bookingController.cancelBooking);

// Health check endpoint
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Booking service is running' });
});

// Admin booking routes - these will be accessible through the admin routes

module.exports = router;
