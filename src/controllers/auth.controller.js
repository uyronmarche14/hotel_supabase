/**
 * Auth Controller
 * Handles user authentication, registration, and profile management
 * 
 * This is now a facade that redirects to the modular implementation
 * in the auth/ directory for better maintainability.
 */

// Export all auth controller functions from the modular implementation
module.exports = require('./auth/index');
