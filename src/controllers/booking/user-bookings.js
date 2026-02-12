/**
 * User Bookings Controller
 * Handles user-specific booking operations
 */

const { db } = require('../../db');
const { bookings, rooms } = require('../../db/schema');
const { eq, desc, and } = require('drizzle-orm');
const AppError = require('../../utils/appError');

/**
 * Get all bookings for the current user
 */
const getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const bookingsData = await db
      .select({
        booking: bookings,
        room: rooms
      })
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(eq(bookings.userId, userId))
      .orderBy(desc(bookings.createdAt));

    // Transform data for frontend compatibility
    const bookingsResponse = bookingsData.map(({ booking, room }) => ({
      id: booking.id,
      roomId: booking.roomId,
      roomTitle: room?.title || booking.roomTitle || '',
      roomImage: room?.imageUrl || booking.roomImage || '',
      roomCategory: room?.category || booking.roomCategory || '',
      roomPrice: room?.price ? parseFloat(room.price) : 0,
      roomLocation: room?.location || booking.location || '',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: parseFloat(booking.totalPrice) || 0,
      nights: booking.nights,
      status: booking.status,
      // paymentMethod: booking.paymentMethod, // Not in Drizzle schema
      specialRequests: booking.specialRequests,
      adults: booking.adults || 1, // Defaulting if null
      children: 0, // Schema doesn't have children column, explicitly 0
      createdAt: booking.createdAt
    }));

    res.status(200).json({
      success: true,
      count: bookingsData.length,
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

    // Build query conditions
    let conditions = eq(bookings.id, id);
    if (req.user.role !== 'admin') {
      conditions = and(conditions, eq(bookings.userId, userId));
    }

    const [result] = await db
      .select({
        booking: bookings,
        room: rooms
      })
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .where(conditions);

    if (!result) {
      return next(new AppError('Booking not found or access denied', 404));
    }

    const { booking, room } = result;

    // Transform data for frontend compatibility
    const bookingResponse = {
      id: booking.id,
      roomId: booking.roomId,
      roomTitle: room?.title || booking.roomTitle || '',
      roomImage: room?.imageUrl || booking.roomImage || '',
      roomCategory: room?.category || booking.roomCategory || '',
      roomPrice: room?.price ? parseFloat(room.price) : 0,
      roomLocation: room?.location || booking.location || '',
      roomAmenities: room?.amenities || [],
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: parseFloat(booking.totalPrice) || 0,
      nights: booking.nights,
      status: booking.status,
      // paymentMethod: booking.paymentMethod,
      specialRequests: booking.specialRequests,
      adults: booking.adults || 1,
      children: 0,
      createdAt: booking.createdAt
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
