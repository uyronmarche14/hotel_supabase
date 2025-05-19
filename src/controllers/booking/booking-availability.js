/**
 * Booking Availability Controller
 * Handles room availability checking
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Check room availability for specific dates
 */
const checkRoomAvailability = async (req, res, next) => {
  try {
    const { roomId, checkIn, checkOut } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Room ID, check-in and check-out dates are required'
      });
    }

    // Check if room exists
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .select('id, is_available')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return next(new AppError('Room not found', 404));
    }

    if (room.is_available === false) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'Room is not available for booking'
      });
    }

    // Check if room is already booked for the dates
    const { data: existingBookings, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`)
      .not('status', 'eq', 'cancelled');

    if (bookingError) {
      return next(new AppError(bookingError.message, 500));
    }

    const isAvailable = existingBookings.length === 0;

    res.status(200).json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Room is available for the selected dates' : 'Room is already booked for the selected dates'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  checkRoomAvailability
};
