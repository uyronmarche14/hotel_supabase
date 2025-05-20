/**
 * Booking Controller - Index File
 * Exports all booking-related controller functions
 */

const userBookings = require("./user-bookings");
const bookingOperations = require("./booking-operations");
const bookingAvailability = require("./booking-availability");
const bookingHistory = require("./booking-history");
const adminBookings = require("./admin-bookings");

module.exports = {
  // User booking operations
  getUserBookings: userBookings.getUserBookings,
  getBookingById: userBookings.getBookingById,

  // Booking management
  createBooking: bookingOperations.createBooking,
  updateBooking: bookingOperations.updateBooking,
  cancelBooking: bookingOperations.cancelBooking,

  // Booking validation
  checkRoomAvailability: bookingAvailability.checkRoomAvailability,
  
  // Booking history
  getBookingHistory: bookingHistory.getBookingHistory,
  getUserBookingHistory: bookingHistory.getUserBookingHistory || userBookings.getUserBookings,
  
  // Admin booking operations
  getAllBookings: adminBookings.getAllBookings,
  updateBookingStatus: adminBookings.updateBookingStatus || bookingOperations.updateBooking,
};
