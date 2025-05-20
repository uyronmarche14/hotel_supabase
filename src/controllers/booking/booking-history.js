/**
 * Booking History Controller
 * Handles booking history and statistics functions
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get booking history with stats
 */
const getBookingHistory = async (req, res, next) => {
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
          location,
          type
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
      bookingId: booking.booking_id || `BK-${Date.now().toString().slice(-6)}`,
      roomId: booking.room_id,
      roomTitle: booking.room_title || booking.rooms?.title || '',
      roomImage: booking.room_image || booking.rooms?.image_url || '',
      roomCategory: booking.room_category || booking.rooms?.category || '',
      roomType: booking.room_type || booking.rooms?.type || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.location || booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      basePrice: booking.base_price || (booking.total_price ? booking.total_price * 0.9 : 0),
      taxAndFees: booking.tax_and_fees || (booking.total_price ? booking.total_price * 0.1 : 0),
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
    
    // Calculate stats
    const totalSpent = bookings.reduce((sum, booking) => 
      booking.status !== 'cancelled' ? sum + (booking.total_price || 0) : sum, 0);
    
    const nonCancelledBookings = bookings.filter(booking => booking.status !== 'cancelled');
    const averagePerBooking = nonCancelledBookings.length > 0 ? 
      totalSpent / nonCancelledBookings.length : 0;
    
    // Find most visited category
    const categoryCount = {};
    bookings.forEach(booking => {
      const category = booking.room_category || booking.rooms?.category;
      if (booking.status !== 'cancelled' && category) {
        categoryCount[category] = (categoryCount[category] || 0) + 1;
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
};

/**
 * Get booking history for a specific user (admin only)
 */
const getUserBookingHistory = async (req, res, next) => {
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
          location,
          type
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
      bookingId: booking.booking_id || `BK-${Date.now().toString().slice(-6)}`,
      roomId: booking.room_id,
      roomTitle: booking.room_title || booking.rooms?.title || '',
      roomImage: booking.room_image || booking.rooms?.image_url || '',
      roomCategory: booking.room_category || booking.rooms?.category || '',
      roomType: booking.room_type || booking.rooms?.type || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.location || booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      basePrice: booking.base_price || (booking.total_price ? booking.total_price * 0.9 : 0),
      taxAndFees: booking.tax_and_fees || (booking.total_price ? booking.total_price * 0.1 : 0),
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
      email: email,
      bookings: bookingsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getBookingHistory,
  getUserBookingHistory
};
