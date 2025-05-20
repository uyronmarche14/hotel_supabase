/**
 * Booking Controller
 * Handles booking-related operations with frontend-compatible responses
 * 
 * This is now a facade that redirects to the modular implementation
 * in the booking/ directory for better maintainability.
 */

// Export all booking controller functions from the modular implementation
module.exports = require('./booking/index');
