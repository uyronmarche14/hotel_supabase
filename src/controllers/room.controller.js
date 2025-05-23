/**
 * Room Controller
 * Handles room-related operations
 * 
 * This controller directly imports individual module files to avoid
 * dependency issues during deployment.
 */

// IMPORTANT: Directly import specific module files to prevent 'MODULE_NOT_FOUND' errors in production
// This is more reliable than using index.js which may cause issues in some deployment environments
try {
  var roomQuery = require('./room/room-query');
  var roomOperations = require('./room/room-operations');
  var imageManagement = require('./room/image-management');
  
  console.log('Successfully loaded room controller modules');
} catch (error) {
  console.error('Error loading room controller modules:', error.message);
  // Provide fallbacks to prevent fatal crashes
  roomQuery = roomQuery || {};
  roomOperations = roomOperations || {};
  imageManagement = imageManagement || {};
}

// Export all functions
module.exports = {
  // Room query functions
  getAllRooms: roomQuery.getAllRooms,
  getTopRatedRooms: roomQuery.getTopRatedRooms,
  getRoomCategories: roomQuery.getRoomCategories,
  getCategorySamples: roomQuery.getCategorySamples,
  searchRooms: roomQuery.searchRooms,
  getRoomsByCategory: roomQuery.getRoomsByCategory,
  getRoomById: roomQuery.getRoomById,
  
  // Room operations
  createRoom: roomOperations.createRoom,
  updateRoom: roomOperations.updateRoom,
  deleteRoom: roomOperations.deleteRoom,
  checkRoomAvailability: roomOperations.checkRoomAvailability,
  
  // Image management
  uploadRoomImage: imageManagement.uploadRoomImage,
  uploadRoomImages: imageManagement.uploadRoomImages
};
