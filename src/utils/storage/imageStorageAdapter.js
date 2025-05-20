/**
 * Image Storage Adapter
 * Provides a unified interface for image storage operations
 * This adapter allows easy switching between different storage providers
 */

const cloudinaryStorage = require('./cloudinaryStorage');
const supabaseStorage = require('./roomStorage'); // Original Supabase storage
const AppError = require('../appError');

// Configure which storage provider to use
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || 'cloudinary'; // 'cloudinary' or 'supabase'

/**
 * Upload a room image
 * @param {string} roomId - Room ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadRoomImage = async (roomId, fileBuffer, fileName, contentType) => {
  try {
    if (STORAGE_PROVIDER === 'cloudinary') {
      return await cloudinaryStorage.uploadRoomImage(roomId, fileBuffer, fileName, contentType);
    } else {
      return await supabaseStorage.uploadRoomImage(roomId, fileBuffer, fileName, contentType);
    }
  } catch (error) {
    console.error('Error uploading room image:', error);
    throw new AppError('Failed to upload room image', 500);
  }
};

/**
 * Upload multiple room images
 * @param {string} roomId - Room ID
 * @param {Array} files - Array of file objects with buffer, originalname, and mimetype
 * @returns {Promise<Array<string>>} - Array of public URLs of the uploaded images
 */
const uploadMultipleRoomImages = async (roomId, files) => {
  try {
    if (STORAGE_PROVIDER === 'cloudinary') {
      return await cloudinaryStorage.uploadMultipleRoomImages(roomId, files);
    } else {
      return await supabaseStorage.uploadMultipleRoomImages(roomId, files);
    }
  } catch (error) {
    console.error('Error uploading multiple room images:', error);
    throw new AppError('Failed to upload multiple room images', 500);
  }
};

/**
 * Upload a profile picture
 * @param {string} userId - User ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadProfilePicture = async (userId, fileBuffer, fileName, contentType) => {
  try {
    if (STORAGE_PROVIDER === 'cloudinary') {
      return await cloudinaryStorage.uploadProfilePicture(userId, fileBuffer, fileName, contentType);
    } else {
      // Fall back to original profile picture upload if it exists
      if (typeof supabaseStorage.uploadProfilePicture === 'function') {
        return await supabaseStorage.uploadProfilePicture(userId, fileBuffer, fileName, contentType);
      } else {
        throw new AppError('Profile picture upload not implemented for this storage provider', 500);
      }
    }
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    throw new AppError('Failed to upload profile picture', 500);
  }
};

/**
 * Delete an image
 * @param {string} imageUrl - Image URL or public ID
 * @returns {Promise<boolean>} - True if deletion was successful
 */
const deleteImage = async (imageUrl) => {
  try {
    if (STORAGE_PROVIDER === 'cloudinary') {
      // Extract public ID if this is a Cloudinary URL
      const publicId = cloudinaryStorage.getPublicIdFromUrl(imageUrl);
      if (!publicId) {
        throw new AppError('Invalid Cloudinary URL', 400);
      }
      return await cloudinaryStorage.deleteImage(publicId);
    } else {
      // Fall back to original delete method if it exists
      if (typeof supabaseStorage.deleteRoomImage === 'function') {
        return await supabaseStorage.deleteRoomImage(imageUrl);
      } else {
        throw new AppError('Image deletion not implemented for this storage provider', 500);
      }
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw new AppError('Failed to delete image', 500);
  }
};

/**
 * Optimize an image URL for specific dimensions
 * @param {string} imageUrl - Original image URL
 * @param {Object} options - Transformation options like width, height, crop
 * @returns {string} - Optimized image URL
 */
const optimizeImageUrl = (imageUrl, options = {}) => {
  if (STORAGE_PROVIDER === 'cloudinary' && imageUrl && imageUrl.includes('cloudinary')) {
    return cloudinaryStorage.optimizeImageUrl(imageUrl, options);
  }
  return imageUrl; // Return original URL for non-Cloudinary images
};

module.exports = {
  uploadRoomImage,
  uploadMultipleRoomImages,
  uploadProfilePicture,
  deleteImage,
  optimizeImageUrl
};
