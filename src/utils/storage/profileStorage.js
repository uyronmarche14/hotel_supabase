/**
 * Profile Picture Storage Utility
 * Handles uploading, retrieving, and managing profile pictures in Supabase Storage
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../appError');

// Storage bucket name for profile pictures
const BUCKET_NAME = 'profile-pictures';

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
        fileSizeLimit: 1024 * 1024 * 2, // 2MB file size limit
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/gif']
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
 * Upload profile picture
 * @param {string} userId - User ID
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - Public URL of the uploaded image
 */
const uploadProfilePicture = async (userId, fileBuffer, fileName, contentType) => {
  try {
    await initStorage();
    
    // Generate a unique file name to prevent collisions
    const fileExt = fileName.split('.').pop();
    const uniqueFileName = `${userId}_${Date.now()}.${fileExt}`;
    
    // Upload file to Supabase Storage
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .upload(uniqueFileName, fileBuffer, {
        contentType,
        upsert: true // Overwrite if file exists
      });
    
    if (error) {
      console.error('Error uploading profile picture:', error);
      throw new AppError('Failed to upload profile picture', 500);
    }
    
    // Get public URL
    const { data } = supabaseClient.storage
      .from(BUCKET_NAME)
      .getPublicUrl(uniqueFileName);
    
    return data.publicUrl;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw new AppError(error.message || 'Failed to upload profile picture', 500);
  }
};

/**
 * Delete profile picture
 * @param {string} fileUrl - Public URL of the file to delete
 * @returns {Promise<boolean>} - Success status
 */
const deleteProfilePicture = async (fileUrl) => {
  try {
    if (!fileUrl) return true;
    
    // Extract file name from URL
    const urlParts = fileUrl.split('/');
    const fileName = urlParts[urlParts.length - 1];
    
    // Delete file from Supabase Storage
    const { error } = await supabaseClient.storage
      .from(BUCKET_NAME)
      .remove([fileName]);
    
    if (error) {
      console.error('Error deleting profile picture:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Profile picture deletion error:', error);
    return false;
  }
};

/**
 * Get profile picture URL
 * @param {string} fileName - File name
 * @returns {string} - Public URL of the profile picture
 */
const getProfilePictureUrl = (fileName) => {
  if (!fileName) return null;
  
  const { data } = supabaseClient.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);
  
  return data.publicUrl;
};

module.exports = {
  uploadProfilePicture,
  deleteProfilePicture,
  getProfilePictureUrl,
  initStorage
};
