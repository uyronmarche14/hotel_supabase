/**
 * Booking Controller - Index File
 * Exports all booking-related controller functions
 */

const userBookings = require('./user-bookings');
const bookingOperations = require('./booking-operations');
const bookingAvailability = require('./booking-availability');
const adminBookings = require('./admin-bookings');
const bookingHistory = require('./booking-history');

module.exports = {
  // User booking functions
  getUserBookings: userBookings.getUserBookings,
  getBookingById: userBookings.getBookingById,
  
  // Booking operations
  createBooking: bookingOperations.createBooking,
  updateBooking: bookingOperations.updateBooking,
  cancelBooking: bookingOperations.cancelBooking,
  
  // Availability checking
  checkRoomAvailability: bookingAvailability.checkRoomAvailability,
  
  // Booking history and statistics
  getBookingHistory: bookingHistory.getBookingHistory,
  getUserBookingHistory: bookingHistory.getUserBookingHistory,
  
  // Admin booking functions
  getAllBookings: adminBookings.getAllBookings,
  updateBookingStatus: adminBookings.updateBookingStatus,
};
