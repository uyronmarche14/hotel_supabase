/**
 * User Bookings Controller
 * Handles user-specific booking operations
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

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
      count: bookings.length,
      bookings: bookingsResponse
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
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      roomAmenities: booking.rooms?.amenities || [],
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
