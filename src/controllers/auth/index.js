/**
 * Auth Controller - Index File
 * Exports all authentication-related controller functions
 */

const registerLogin = require('./register-login');
const profileManagement = require('./profile-management');
const tokenManagement = require('./token-management');
const passwordManagement = require('./password-management');

module.exports = {
  // Registration and login
  register: registerLogin.register,
  login: registerLogin.login,
  adminLogin: registerLogin.adminLogin,
  
  // Profile management
  getCurrentUser: profileManagement.getCurrentUser,
  updateUserProfile: profileManagement.updateUserProfile,
  
  // Token management
  refreshToken: tokenManagement.refreshToken,
  logout: tokenManagement.logout,
  
  // Password management
  forgotPassword: passwordManagement.forgotPassword,
  resetPassword: passwordManagement.resetPassword,
  changePassword: passwordManagement.changePassword
};
