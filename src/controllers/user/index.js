/**
 * User Controller - Index File
 * Exports all user-related controller functions
 */

const profileManagement = require('./profile-management');
const adminUserManagement = require('./admin-user-management');

module.exports = {
  // Profile management functions
  getUserProfile: profileManagement.getUserProfile,
  updateUserProfile: profileManagement.updateUserProfile,
  changePassword: profileManagement.changePassword,
  
  // Admin user management functions
  getAllUsers: adminUserManagement.getAllUsers,
  getUserById: adminUserManagement.getUserById,
  updateUser: adminUserManagement.updateUser,
  deleteUser: adminUserManagement.deleteUser
};
