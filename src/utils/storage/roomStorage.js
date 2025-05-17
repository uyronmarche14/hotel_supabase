/**
 * Room Image Storage Utility
 * Handles uploading, retrieving, and managing room images in Supabase Storage
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../appError');

// Storage bucket name for room images
const BUCKET_NAME = 'room-images';

/**
 * Initialize storage bucket if it doesn't exist
 */
const initStorage = async () => {
  try {
    // Check if bucket exists
    const { data: buckets } = await supabaseClient.storage.listBuckets();
    const bucketExists = buckets.some(bucket => bucket.name === BUCKET_NAME);
    
    // Create bucket if it doesn't exist
    if (!bucketExists) {
      const { error } = await supabaseClient.storage.createBucket(BUCKET_NAME, {
        public: true, // Make bucket publicly accessible
        fileSizeLimit: 1024 * 1024 * 5, // 5MB file size limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      
      if (error) {
        console.error('Error creating storage bucket:', error);
        throw new AppError('Failed to initialize storage', 500);
      }
      
      console.log(`Storage bucket '${BUCKET_NAME}' created successfully`);
    }
  } catch (error) {
    console.error('Storage initialization error:', error);
    throw new AppError('Failed to initialize storage', 500);
  }
};

/**
 * Upload room image
 * @param {string} roomId - Room ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadRoomImage = async (roomId, fileBuffer, fileName, contentType) => {
  try {
    await initStorage();
    
    // Generate a unique file name to prevent collisions
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${roomId}_${Date.now()}.${fileExt}`;
    
    // Upload file to Supabase Storage
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, fileBuffer, {
        contentType,
        upsert: true // Overwrite if file exists
      });
    
    if (error) {
      console.error('Error uploading room image:', error);
      throw new AppError('Failed to upload room image', 500);
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uniqueFileName);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Room image upload error:', error);
    throw new AppError(error.message || 'Failed to upload room image', 500);
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
    const imageUrls = [];
    
    for (const file of files) {
      const imageUrl = await uploadRoomImage(
        roomId,
        file.buffer,
        file.originalname,
        file.mimetype
      );
      
      imageUrls.push(imageUrl);
    }
    
    return imageUrls;
  } catch (error) {
    console.error('Multiple room images upload error:', error);
    throw new AppError(error.message || 'Failed to upload room images', 500);
  }
};

/**
 * Delete room image
 * @param {string} imageUrl - Public URL of the image to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteRoomImage = async (imageUrl) => {
  try {
    if (!imageUrl) return true;
    
    // Extract file name from URL
    const urlParts = imageUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Delete file from Supabase Storage
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([fileName]);
    
    if (error) {
      console.error('Error deleting room image:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Room image deletion error:', error);
    return false;
  }
};

/**
 * Get room image URL
 * @param {string} fileName - File name
 * @returns {string} - Public URL of the room image
 */
const getRoomImageUrl = (fileName) => {
  if (!fileName) return null;
  
  const { data } = supabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

module.exports = {
  uploadRoomImage,
  uploadMultipleRoomImages,
  deleteRoomImage,
  getRoomImageUrl,
  initStorage
};
