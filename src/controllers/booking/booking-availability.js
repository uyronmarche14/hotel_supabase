/**
 * Booking Availability Controller
 * Handles room availability checking
 */

const { db } = require('../../db');
const { rooms, bookings } = require('../../db/schema');
const { eq, and, or, lte, gte, ne } = require('drizzle-orm');
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
    const [room] = await db
      .select({ id: rooms.id, isAvailable: rooms.isAvailable })
      .from(rooms)
      .where(eq(rooms.id, roomId));

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    if (room.isAvailable === false) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'Room is not available for booking'
      });
    }

    // Check if room is already booked for the dates
    const overlaps = await db
      .select({ id: bookings.id })
      .from(bookings)
      .where(
        and(
          eq(bookings.roomId, roomId),
          or(
            and(lte(bookings.checkIn, checkOut), gte(bookings.checkOut, checkIn))
          ),
          ne(bookings.status, 'cancelled')
        )
      );

    const isAvailable = overlaps.length === 0;

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
