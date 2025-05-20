/**
 * Room Image Management Controller
 * Handles uploading and managing room images
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { uploadRoomImage: uploadRoomImageUtil, uploadMultipleRoomImages: uploadMultipleRoomImagesUtil, deleteRoomImage } = require('../../utils/storage/roomStorage');

/**
 * Upload single room image
 */
const uploadRoomImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if room exists
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('id, image_url, images')
      .eq('id', id)
      .single();
    
    if (findError || !room) {
      return next(new AppError('Room not found', 404));
    }
    
    // Check if file is provided
    if (!req.file) {
      return next(new AppError('No image file provided', 400));
    }
    
    // Upload image
    const imageUrl = await uploadRoomImageUtil(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    // Update room with new image URL
    const updateData = {};
    
    // If setAsMain query parameter is true, set as main image
    if (req.query.setAsMain === 'true') {
      updateData.image_url = imageUrl;
    }
    
    // Add to images array
    let images = room.images || [];
    images.push(imageUrl);
    updateData.images = images;
    
    // Update room
    const { error: updateError } = await supabaseClient
      .from('rooms')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      return next(new AppError(`Failed to update room with new image: ${updateError.message}`, 500));
    }
    
    res.status(200).json({
      success: true,
      message: 'Room image uploaded successfully',
      imageUrl: imageUrl
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Upload multiple room images
 */
const uploadRoomImages = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if room exists
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('id, image_url, images')
      .eq('id', id)
      .single();
    
    if (findError || !room) {
      return next(new AppError('Room not found', 404));
    }
    
    // Check if files are provided
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No image files provided', 400));
    }
    
    // Upload images
    const imageUrls = await uploadMultipleRoomImagesUtil(id, req.files);
    
    // Update room with new image URLs
    const updateData = {};
    
    // If setFirstAsMain query parameter is true, set first image as main image
    if (req.query.setFirstAsMain === 'true' && imageUrls.length > 0) {
      updateData.image_url = imageUrls[0];
    }
    
    // Add to images array
    let images = room.images || [];
    updateData.images = [...images, ...imageUrls];
    
    // Update room
    const { error: updateError } = await supabaseClient
      .from('rooms')
      .update(updateData)
      .eq('id', id);
    
    if (updateError) {
      return next(new AppError(`Failed to update room with new images: ${updateError.message}`, 500));
    }
    
    res.status(200).json({
      success: true,
      message: 'Room images uploaded successfully',
      count: imageUrls.length,
      imageUrls: imageUrls
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  uploadRoomImage,
  uploadRoomImages
};
