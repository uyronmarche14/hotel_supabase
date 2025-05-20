/**
 * Cloudinary Storage Utilities
 * Handles uploading, retrieving, and managing images in Cloudinary
 */

const stream = require('stream');
const cloudinary = require('../../config/cloudinary');
const AppError = require('../../utils/appError');

/**
 * Convert buffer to stream for Cloudinary upload
 * @param {Buffer} buffer - File buffer 
 * @returns {ReadableStream} - Readable stream
 */
const bufferToStream = (buffer) => {
  return stream.Readable.from(buffer);
};

/**
 * Upload an image to Cloudinary
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} folder - Destination folder in Cloudinary
 * @param {Object} options - Additional upload options
 * @returns {Promise<Object>} - Result containing URL and public ID of the uploaded image
 */
const uploadImage = async (fileBuffer, folder, options = {}) => {
  try {
    console.log('Cloudinary upload attempt:', {
      folder,
      fileSize: fileBuffer ? `${Math.round(fileBuffer.length / 1024)} KB` : 'no buffer',
      options: JSON.stringify(options),
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'not set',
      apiKeyPresent: !!process.env.CLOUDINARY_API_KEY,
      apiSecretPresent: !!process.env.CLOUDINARY_API_SECRET
    });

    // Create a promise to handle the upload
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          ...options
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            return reject(error);
          }
          
          console.log('Cloudinary upload successful:', {
            url: result.secure_url ? result.secure_url.substring(0, 50) + '...' : 'no url',
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height
          });
          
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            width: result.width,
            height: result.height
          });
        }
      );
      
      // Convert buffer to stream and pipe to uploadStream
      bufferToStream(fileBuffer).pipe(uploadStream);
    });
  } catch (error) {
    console.error('Image upload error:', error);
    throw new AppError('Failed to upload image', 500);
  }
};

/**
 * Upload a room image to Cloudinary
 * @param {string} roomId - Room ID
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadRoomImage = async (roomId, fileBuffer, fileName, contentType) => {
  try {
    const uploadResult = await uploadImage(fileBuffer, 'rooms', {
      public_id: `room_${roomId}_${Date.now()}`,
      tags: ['room', roomId],
      content_type: contentType
    });
    
    return uploadResult.url;
  } catch (error) {
    console.error('Room image upload error:', error);
    throw new AppError(error.message || 'Failed to upload room image', 500);
  }
};

/**
 * Upload multiple room images to Cloudinary
 * @param {string} roomId - Room ID
 * @param {Array} files - Array of file objects with buffer, originalname, and mimetype
 * @returns {Promise<Array<string>>} - Array of URLs of the uploaded images
 */
const uploadMultipleRoomImages = async (roomId, files) => {
  try {
    const uploadPromises = files.map(file => 
      uploadRoomImage(roomId, file.buffer, file.originalname, file.mimetype)
    );
    
    return Promise.all(uploadPromises);
  } catch (error) {
    console.error('Multiple room images upload error:', error);
    throw new AppError(error.message || 'Failed to upload room images', 500);
  }
};

/**
 * Upload a profile picture to Cloudinary
 * @param {string} userId - User ID
 * @param {Buffer} fileBuffer - Image file buffer
 * @param {string} fileName - Original file name
 * @param {string} contentType - File MIME type
 * @returns {Promise<string>} - URL of the uploaded image
 */
const uploadProfilePicture = async (userId, fileBuffer, fileName, contentType) => {
  try {
    const uploadResult = await uploadImage(fileBuffer, 'profiles', {
      public_id: `profile_${userId}_${Date.now()}`,
      tags: ['profile', userId],
      content_type: contentType,
      transformation: [
        { width: 400, height: 400, crop: "limit" }
      ]
    });
    
    return uploadResult.url;
  } catch (error) {
    console.error('Profile picture upload error:', error);
    throw new AppError(error.message || 'Failed to upload profile picture', 500);
  }
};

/**
 * Delete an image from Cloudinary
 * @param {string} publicId - Public ID of the image (full public_id including folder)
 * @returns {Promise<boolean>} - True if deletion was successful
 */
const deleteImage = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result.result === 'ok';
  } catch (error) {
    console.error('Image deletion error:', error);
    throw new AppError('Failed to delete image', 500);
  }
};

/**
 * Extract public ID from Cloudinary URL
 * @param {string} url - Cloudinary image URL
 * @returns {string|null} - Public ID or null if not a valid Cloudinary URL
 */
const getPublicIdFromUrl = (url) => {
  if (!url || typeof url !== 'string') return null;
  
  try {
    // Extract the public ID from URL
    // Format: https://res.cloudinary.com/cloud-name/image/upload/v1234567890/folder/filename.ext
    const regex = /\/v\d+\/(.+)\.\w+$/;
    const match = url.match(regex);
    
    return match ? match[1] : null;
  } catch (error) {
    console.error('Error extracting public ID:', error);
    return null;
  }
};

/**
 * Create an optimized image URL with transformations
 * @param {string} url - Original Cloudinary URL
 * @param {Object} options - Transformation options
 * @returns {string} - Transformed image URL
 */
const optimizeImageUrl = (url, options = {}) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) {
    return url; // Return original URL if not a Cloudinary URL
  }
  
  const defaultOptions = {
    quality: 'auto',
    format: 'auto',
    fetch_format: 'auto'
  };
  
  const transformationOptions = { ...defaultOptions, ...options };
  
  // Parse the URL
  const parsedUrl = new URL(url);
  const pathParts = parsedUrl.pathname.split('/');
  
  // Find the upload part index
  const uploadIndex = pathParts.findIndex(part => part === 'upload');
  if (uploadIndex === -1) return url;
  
  // Build transformation string
  const transformations = Object.entries(transformationOptions)
    .map(([key, value]) => `${key}_${value}`)
    .join(',');
  
  // Insert transformations after 'upload'
  pathParts.splice(uploadIndex + 1, 0, transformations);
  parsedUrl.pathname = pathParts.join('/');
  
  return parsedUrl.toString();
};

module.exports = {
  uploadImage,
  uploadRoomImage,
  uploadMultipleRoomImages,
  uploadProfilePicture,
  deleteImage,
  getPublicIdFromUrl,
  optimizeImageUrl
};
