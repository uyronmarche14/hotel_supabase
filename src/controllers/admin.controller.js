/**
 * Admin Controller
 * Handles admin-specific operations and dashboard statistics
 * 
 * This is now a facade that redirects to the modular implementation
 * in the admin/ directory for better maintainability.
 */

// Export all admin controller functions from the modular implementation
module.exports = require('./admin/index');
