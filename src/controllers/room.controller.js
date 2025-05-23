/**
 * Room Controller
 * Handles room-related operations
 * 
 * This is now a facade that redirects to the modular implementation
 * in the room/ directory for better maintainability.
 */

// Import the modular implementations directly from their source files
const roomQuery = require('./room/room-query');
const roomOperations = require('./room/room-operations');
const imageManagement = require('./room/image-management');

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
