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

// Get booking history with stats
router.get('/history', async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Get all user bookings with room details
    const { data: bookings, error } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
    const bookingsResponse = bookings.map(booking => ({
      id: booking.id,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      nights: booking.nights,
      status: booking.status,
      paymentMethod: booking.payment_method,
      specialRequests: booking.special_requests,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.created_at
    }));
    
    // Calculate stats
    const totalSpent = bookings.reduce((sum, booking) => 
      booking.status !== 'cancelled' ? sum + (booking.total_price || 0) : sum, 0);
    
    const nonCancelledBookings = bookings.filter(booking => booking.status !== 'cancelled');
    const averagePerBooking = nonCancelledBookings.length > 0 ? 
      totalSpent / nonCancelledBookings.length : 0;
    
    // Find most visited category
    const categoryCount = {};
    bookings.forEach(booking => {
      if (booking.status !== 'cancelled' && booking.rooms?.category) {
        categoryCount[booking.rooms.category] = (categoryCount[booking.rooms.category] || 0) + 1;
      }
    });
    
    let mostVisitedCategory = null;
    let maxCount = 0;
    
    Object.entries(categoryCount).forEach(([category, count]) => {
      if (count > maxCount) {
        mostVisitedCategory = category;
        maxCount = count;
      }
    });
    
    res.status(200).json({
      success: true,
      history: {
        bookings: bookingsResponse,
        stats: {
          totalSpent: parseFloat(totalSpent.toFixed(2)),
          averagePerBooking: parseFloat(averagePerBooking.toFixed(2)),
          mostVisitedCategory,
          totalBookings: bookings.length
        }
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

// Get booking history for a specific user (admin only)
router.get('/history/:email', authMiddleware.isAdmin, async (req, res, next) => {
  try {
    const { email } = req.params;
    
    // Find user by email
    const { data: user, error: userError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();
    
    if (userError || !user) {
      return next(new AppError('User not found', 404));
    }
    
    // Get all user bookings with room details
    const { data: bookings, error } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    
    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
    const bookingsResponse = bookings.map(booking => ({
      id: booking.id,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      nights: booking.nights,
      status: booking.status,
      paymentMethod: booking.payment_method,
      specialRequests: booking.special_requests,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.created_at
    }));
    
    res.status(200).json({
      success: true,
      email: email,
      bookings: bookingsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
});

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
