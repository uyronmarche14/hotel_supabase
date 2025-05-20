/**
 * Cloudinary Image Controller
 * Handles specialized Cloudinary image operations
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const crypto = require('crypto');
const { 
  deleteImage, 
  getPublicIdFromUrl 
} = require('../../utils/storage/cloudinaryStorage');
const cloudinary = require('../../config/cloudinary');

/**
 * Generate a Cloudinary upload signature for direct frontend uploads
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const generateSignature = async (req, res, next) => {
  try {
    // Generate a timestamp
    const timestamp = Math.round(new Date().getTime() / 1000);
    
    // Set folder based on query params or default to 'rooms'
    const folder = req.query.folder || 'rooms';
    
    // Create the signature payload
    const payload = {
      timestamp: timestamp,
      folder: folder
    };
    
    // Add any additional restrictions
    if (req.query.public_id) {
      payload.public_id = req.query.public_id;
    }
    
    // Create the signature string
    const signatureString = Object.keys(payload)
      .sort()
      .map(key => `${key}=${payload[key]}`)
      .join('&') + process.env.CLOUDINARY_API_SECRET;
    
    // Generate the SHA-1 hash
    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');
    
    // Return the necessary data for frontend direct upload
    res.status(200).json({
      success: true,
      signature,
      timestamp,
      api_key: process.env.CLOUDINARY_API_KEY,
      folder,
      cloudName: process.env.CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    console.error('Error generating signature:', error);
    next(new AppError('Failed to generate upload signature', 500));
  }
};

/**
 * Synchronize image info with database after direct upload
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const syncImage = async (req, res, next) => {
  try {
    const { entityType, id } = req.params;
    const { image_url, public_id, is_main_image = false } = req.body;
    
    if (!image_url) {
      return next(new AppError('Image URL is required', 400));
    }
    
    console.log(`Syncing image for ${entityType} with ID ${id}:`, {
      image_url: image_url.substring(0, 50) + '...',
      public_id,
      is_main_image
    });
    
    // Handle room images
    if (entityType === 'rooms') {
      // Check if room exists
      const { data: room, error: findError } = await supabaseClient
        .from('rooms')
        .select('id, image_url, images')
        .eq('id', id)
        .single();
      
      if (findError || !room) {
        return next(new AppError('Room not found', 404));
      }
      
      // Prepare update data
      const updateData = {};
      
      // If this is the main image or there's no main image set
      if (is_main_image || !room.image_url) {
        updateData.image_url = image_url;
      }
      
      // Add to images array if not already there
      let images = Array.isArray(room.images) ? [...room.images] : [];
      if (!images.includes(image_url)) {
        images.push(image_url);
        updateData.images = images;
      }
      
      // Update the room
      const { error: updateError } = await supabaseClient
        .from('rooms')
        .update(updateData)
        .eq('id', id);
      
      if (updateError) {
        console.error('Failed to update room with image:', updateError);
        return next(new AppError('Failed to update room with image', 500));
      }
      
      res.status(200).json({
        success: true,
        message: 'Room updated with new image',
        image_url,
        is_main_image: updateData.image_url === image_url
      });
    } else {
      return next(new AppError(`Entity type '${entityType}' not supported`, 400));
    }
  } catch (error) {
    console.error('Error syncing image:', error);
    next(new AppError('Failed to sync image with database', 500));
  }
};

/**
 * Test Cloudinary connection
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const testConnection = async (req, res, next) => {
  try {
    console.log('Cloudinary Environment Variables Check:');
    console.log('- CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET');
    console.log('- CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY ? 'SET' : 'NOT SET');
    console.log('- CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET' : 'NOT SET');
    
    // Test signature generation
    const timestamp = Math.round(new Date().getTime() / 1000);
    const folder = 'test';
    const signatureString = `folder=${folder}&timestamp=${timestamp}${process.env.CLOUDINARY_API_SECRET}`;
    
    // Generate the SHA-1 hash
    const signature = crypto
      .createHash('sha1')
      .update(signatureString)
      .digest('hex');
      
    console.log('Test signature generation:', {
      timestamp,
      folder,
      signature: signature ? signature.substring(0, 6) + '...' : 'FAILED'
    });
    
    // Test if we can access the Cloudinary API
    const result = await cloudinary.api.ping();
    
    res.status(200).json({
      success: true,
      message: 'Cloudinary connection successful',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKeyPresent: !!process.env.CLOUDINARY_API_KEY,
      apiSecretPresent: !!process.env.CLOUDINARY_API_SECRET,
      testSignature: signature.substring(0, 6) + '...',
      result
    });
  } catch (error) {
    console.error('Cloudinary connection test failed:', error);
    res.status(500).json({
      success: false,
      message: 'Cloudinary connection failed',
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || 'NOT SET',
      apiKeyPresent: !!process.env.CLOUDINARY_API_KEY,
      apiSecretPresent: !!process.env.CLOUDINARY_API_SECRET,
      error: error.message
    });
  }
};

/**
 * Delete an image from Cloudinary and update references in the database
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const deleteCloudinaryImage = async (req, res, next) => {
  try {
    const { imageUrl } = req.body;
    
    if (!imageUrl) {
      return next(new AppError('Image URL is required', 400));
    }
    
    // Check if this is a Cloudinary URL
    if (!imageUrl.includes('cloudinary.com')) {
      return next(new AppError('Not a valid Cloudinary URL', 400));
    }
    
    // Extract the public ID from the URL
    const publicId = getPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      return next(new AppError('Could not extract public ID from URL', 400));
    }
    
    // Log operation details
    console.log('Attempting to delete Cloudinary image:', {
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none',
      publicId
    });
    
    // Delete the image from Cloudinary
    const deleted = await deleteImage(publicId);
    
    if (!deleted) {
      console.error('Failed to delete image from Cloudinary', { publicId });
      return next(new AppError('Failed to delete image from Cloudinary', 500));
    }
    
    console.log('Successfully deleted image from Cloudinary:', { publicId });
    
    // Remove image references from all rooms
    try {
      // First, find any rooms using this image as main image
      const { data: mainImageRooms } = await supabaseClient
        .from('rooms')
        .select('id, title')
        .eq('image_url', imageUrl);
      
      if (mainImageRooms && mainImageRooms.length > 0) {
        console.log('Found rooms using this as main image:', {
          count: mainImageRooms.length,
          rooms: mainImageRooms.map(r => r.id).join(', ')
        });
        
        // For each room, set image_url to null or first available additional image
        for (const room of mainImageRooms) {
          // Get room with images
          const { data: fullRoom } = await supabaseClient
            .from('rooms')
            .select('images')
            .eq('id', room.id)
            .single();
          
          // Remove this image URL from images array
          let images = Array.isArray(fullRoom?.images) ? fullRoom.images.filter(img => img !== imageUrl) : [];
          
          // Update room with null main image or first additional image
          const { error: updateError } = await supabaseClient
            .from('rooms')
            .update({
              image_url: images.length > 0 ? images[0] : null,
              images: images
            })
            .eq('id', room.id);
          
          if (updateError) {
            console.error('Failed to update room after image deletion:', {
              roomId: room.id,
              error: updateError.message
            });
          } else {
            console.log('Updated room after main image deletion:', {
              roomId: room.id,
              newMainImage: images.length > 0 ? 'set from additional images' : 'null',
              remainingImagesCount: images.length
            });
          }
        }
      }
      
      // Now update all rooms that have this image in their images array
      const { data: rooms } = await supabaseClient
        .from('rooms')
        .select('id, title, images')
        .filter('images', 'cs', `{"${imageUrl}"}`); // Containment search for the image URL in the JSONB array
      
      if (rooms && rooms.length > 0) {
        console.log('Found rooms with this image in additional images:', {
          count: rooms.length,
          rooms: rooms.map(r => r.id).join(', ')
        });
        
        // For each room, remove the image URL from the images array
        for (const room of rooms) {
          if (!Array.isArray(room.images)) continue;
          
          const updatedImages = room.images.filter(img => img !== imageUrl);
          
          const { error: updateError } = await supabaseClient
            .from('rooms')
            .update({ images: updatedImages })
            .eq('id', room.id);
            
          if (updateError) {
            console.error('Failed to update room images array:', {
              roomId: room.id,
              error: updateError.message
            });
          } else {
            console.log('Removed image from room images array:', {
              roomId: room.id,
              previousCount: room.images.length,
              newCount: updatedImages.length
            });
          }
        }
      }
    } catch (error) {
      console.error('Error updating database after image deletion:', error);
      // We don't want to fail the deletion if database update fails
      // The image is already deleted from Cloudinary at this point
    }
    
    // Return success response
    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      url: imageUrl
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Transform a Cloudinary image and return the transformed URL
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const transformCloudinaryImage = async (req, res, next) => {
  try {
    const { imageUrl, transformations } = req.body;
    
    if (!imageUrl) {
      return next(new AppError('Image URL is required', 400));
    }
    
    if (!transformations || !Array.isArray(transformations)) {
      return next(new AppError('Transformations must be an array', 400));
    }
    
    // Check if this is a Cloudinary URL
    if (!imageUrl.includes('cloudinary.com')) {
      return next(new AppError('Not a valid Cloudinary URL', 400));
    }
    
    // Extract the public ID and version from the URL
    const match = imageUrl.match(/\/v\d+\/(.+)$/);
    if (!match || !match[1]) {
      return next(new AppError('Could not extract public ID from URL', 400));
    }
    
    const publicId = match[1].split('.')[0];
    
    // Generate transformed URL
    const transformedUrl = cloudinary.url(publicId, {
      transformation: transformations
    });
    
    // Return transformed URL
    res.status(200).json({
      success: true,
      message: 'Image transformed successfully',
      originalUrl: imageUrl,
      transformedUrl: transformedUrl
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get information about a Cloudinary image
 * @param {object} req - Express request object
 * @param {object} res - Express response object
 * @param {function} next - Express next middleware function
 */
const getCloudinaryImageInfo = async (req, res, next) => {
  try {
    const { imageUrl } = req.query;
    
    if (!imageUrl) {
      return next(new AppError('Image URL is required', 400));
    }
    
    // Check if this is a Cloudinary URL
    if (!imageUrl.includes('cloudinary.com')) {
      return next(new AppError('Not a valid Cloudinary URL', 400));
    }
    
    // Extract the public ID from the URL
    const publicId = getPublicIdFromUrl(imageUrl);
    
    if (!publicId) {
      return next(new AppError('Could not extract public ID from URL', 400));
    }
    
    // Get image information from Cloudinary
    const result = await new Promise((resolve, reject) => {
      cloudinary.api.resource(publicId, (error, result) => {
        if (error) reject(error);
        else resolve(result);
      });
    });
    
    // Return image information
    res.status(200).json({
      success: true,
      message: 'Image information retrieved successfully',
      url: imageUrl,
      info: {
        publicId: result.public_id,
        format: result.format,
        version: result.version,
        resourceType: result.resource_type,
        type: result.type,
        createdAt: result.created_at,
        bytes: result.bytes,
        width: result.width,
        height: result.height,
        url: result.url,
        secureUrl: result.secure_url
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  deleteCloudinaryImage,
  generateSignature,
  syncImage,
  testConnection,
  transformCloudinaryImage,
  getCloudinaryImageInfo
};
