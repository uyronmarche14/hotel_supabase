/**
 * Booking Controller - Index File
 * Exports all booking-related controller functions
 */

const userBookings = require('./user-bookings');
const bookingOperations = require('./booking-operations');
const bookingAvailability = require('./booking-availability');
const adminBookings = require('./admin-bookings');

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
  
  // Admin booking functions
  getAllBookings: adminBookings.getAllBookings,
  updateBookingStatus: adminBookings.updateBookingStatus,
};
