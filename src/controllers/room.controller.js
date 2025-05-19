/**
 * Room Controller
 * Handles room-related operations
 * 
 * This is now a facade that redirects to the modular implementation
 * in the room/ directory for better maintainability.
 */

// Export all room controller functions from the modular implementation
module.exports = require('./room/index');
