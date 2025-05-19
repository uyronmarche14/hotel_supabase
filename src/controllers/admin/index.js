/**
 * Admin Controller - Index File
 * Exports all admin-related controller functions
 */

const dashboard = require('./dashboard');
const systemHealth = require('./system-health');

module.exports = {
  // Dashboard functions
  getDashboardStats: dashboard.getDashboardStats,
  
  // System health functions
  getSystemHealth: systemHealth.getSystemHealth
};
