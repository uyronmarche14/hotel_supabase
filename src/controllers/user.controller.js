/**
 * User Controller
 * Handles user-related operations
 * 
 * This is now a facade that redirects to the modular implementation
 * in the user/ directory for better maintainability.
 */

// Export all user controller functions from the modular implementation
module.exports = require('./user');
