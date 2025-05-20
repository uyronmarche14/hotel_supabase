/**
 * User Bookings Controller
 * Handles user-specific booking operations
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { validationResult } = require('express-validator');

/**
 * Get all bookings for the current user
 */
const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;

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
      bookingId: booking.booking_id,
      roomId: booking.room_id,
      roomTitle: booking.room_title || booking.rooms?.title || '',
      roomImage: booking.room_image || booking.rooms?.image_url || '',
      roomCategory: booking.room_category || booking.rooms?.category || '',
      roomType: booking.room_type || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.location || booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      basePrice: booking.base_price || 0,
      taxAndFees: booking.tax_and_fees || 0,
      nights: booking.nights,
      status: booking.status,
      paymentStatus: booking.payment_status || 'pending',
      paymentMethod: booking.payment_method || '',
      firstName: booking.first_name || '',
      lastName: booking.last_name || '',
      email: booking.email || '',
      phone: booking.phone || '',
      specialRequests: booking.special_requests || '',
      guests: booking.guests || 0,  // Use guests instead of adults from schema
      adults: booking.guests || 0,   // For backward compatibility
      children: booking.children || 0,
      createdAt: booking.created_at
    }));

    res.status(200).json({
      success: true,
      count: bookings.length,
      data: bookingsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get booking by ID
 */
const getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Users can only view their own bookings unless they are admins
    let query = supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location,
          amenities
        )
      `)
      .eq('id', id);

    // If not admin, restrict to user's own bookings
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data: booking, error } = await query.single();

    if (error || !booking) {
      return next(new AppError('Booking not found or access denied', 404));
    }

    // Transform data for frontend compatibility
    const bookingResponse = {
      id: booking.id,
      bookingId: booking.booking_id,
      roomId: booking.room_id,
      roomTitle: booking.room_title || booking.rooms?.title || '',
      roomImage: booking.room_image || booking.rooms?.image_url || '',
      roomCategory: booking.room_category || booking.rooms?.category || '',
      roomType: booking.room_type || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.location || booking.rooms?.location || '',
      roomAmenities: booking.rooms?.amenities || [],
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      basePrice: booking.base_price || 0,
      taxAndFees: booking.tax_and_fees || 0,
      nights: booking.nights,
      status: booking.status,
      paymentStatus: booking.payment_status || 'pending',
      paymentMethod: booking.payment_method || '',
      firstName: booking.first_name || '',
      lastName: booking.last_name || '',
      email: booking.email || '',
      phone: booking.phone || '',
      specialRequests: booking.special_requests || '',
      guests: booking.guests || 0,  // Use guests from DB schema
      adults: booking.guests || 0,   // For backward compatibility
      children: booking.children || 0,
      createdAt: booking.created_at
    };

    res.status(200).json({
      success: true,
      booking: bookingResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getUserBookings,
  getBookingById
};
