/**
 * Room Controller - Index File
 * Exports all room-related controller functions
 */

const roomQuery = require('./room-query');
const roomOperations = require('./room-operations');
const imageManagement = require('./image-management');

module.exports = {
  // Room query functions
  getAllRooms: roomQuery.getAllRooms,
  getTopRatedRooms: roomQuery.getTopRatedRooms,
  getRoomCategories: roomQuery.getRoomCategories,
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
