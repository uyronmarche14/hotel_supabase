/**
 * Room Image Management Controller
 * Handles uploading and managing room images
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { uploadRoomImage: uploadRoomImageUtil, uploadMultipleRoomImages: uploadMultipleRoomImagesUtil, deleteImage, optimizeImageUrl } = require('../../utils/storage/imageStorageAdapter');

/**
 * Upload single room image
 */
const uploadRoomImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    console.log('Room ID received for image upload:', {
      id: id,
      type: typeof id,
      paramId: req.params.id,
      route: req.originalUrl
    });
    
    // Ensure id is properly formatted
    const roomId = id.toString().trim();
    
    // Check if room exists
    console.log('Searching for room with ID:', roomId);
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (findError) {
      console.error('Error finding room:', findError);
      return next(new AppError(`Room not found: ${findError.message}`, 404));
    }
    
    if (!room) {
      console.error('Room not found for ID:', roomId);
      return next(new AppError('Room not found', 404));
    }
    
    console.log('Room found:', {
      id: room.id,
      title: room.title,
      hasExistingImage: !!room.image_url,
      existingImagesCount: (room.images || []).length
    });
    
    // Check if file is provided
    if (!req.file) {
      return next(new AppError('No image file provided', 400));
    }
    
    console.log('Processing room image upload request:', {
      roomId: id,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      originalName: req.file.originalname,
      setAsMain: req.query.setAsMain === 'true'
    });
    
    // Upload image
    const imageUrl = await uploadRoomImageUtil(
      id,
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    
    console.log('Image uploaded successfully to Cloudinary:', {
      imageUrl: imageUrl ? imageUrl.substring(0, 50) + '...' : 'failed'
    });
    
    // Always set the main image regardless of query parameter
    // This ensures we always have an image_url set
    const updateData = {};
    updateData.image_url = imageUrl;
    
    console.log('ALWAYS setting as main image:', { 
      field: 'image_url', 
      value: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none'
    });
    
    // Add to images array (if not already there)
    let images = Array.isArray(room.images) ? [...room.images] : [];
    if (!images.includes(imageUrl)) {
      images.push(imageUrl);
    }
    updateData.images = images;
    
    console.log('Updating images array:', { 
      previousCount: (room.images || []).length,
      newCount: images.length,
      newImage: imageUrl ? imageUrl.substring(0, 50) + '...' : 'none'
    });
    
    console.log('Supabase update data:', {
      table: 'rooms',
      id: roomId, // Use the properly formatted ID
      updateFields: Object.keys(updateData),
      image_url: updateData.image_url ? updateData.image_url.substring(0, 50) + '...' : 'not set',
      imagesCount: updateData.images ? updateData.images.length : 0
    });
    
    // Force update both fields to ensure they're saved
    console.log('Executing Supabase update with ID:', roomId);
    const { data: updatedRoom, error: updateError } = await supabaseClient
      .from('rooms')
      .update({
        image_url: imageUrl,  // Force update with explicit value
        images: images,       // Force update with explicit value
        updated_at: new Date().toISOString() // Add updated timestamp
      })
      .eq('id', roomId)
      .select('*');
    
    // Log the update results
    console.log('Supabase update result:', {
      success: !updateError,
      error: updateError ? updateError.message : null,
      updatedRoom: updatedRoom ? 'received' : 'not received',
      image_url_updated: updatedRoom && updatedRoom.image_url ? 'yes' : 'no'
    });
    
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
    
    console.log('Room ID received for multiple images upload:', {
      id: id,
      type: typeof id,
      paramId: req.params.id,
      route: req.originalUrl,
      fileCount: req.files ? req.files.length : 0
    });
    
    // Ensure id is properly formatted
    const roomId = id.toString().trim();
    
    // Check if room exists
    console.log('Searching for room with ID:', roomId);
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', roomId)
      .single();
    
    if (findError) {
      console.error('Error finding room:', findError);
      return next(new AppError(`Room not found: ${findError.message}`, 404));
    }
    
    if (!room) {
      console.error('Room not found for ID:', roomId);
      return next(new AppError('Room not found', 404));
    }
    
    console.log('Room found for multiple images:', {
      id: room.id,
      title: room.title,
      hasExistingImage: !!room.image_url,
      existingImagesCount: (room.images || []).length
    });
    
    // Check if files are provided
    if (!req.files || req.files.length === 0) {
      return next(new AppError('No image files provided', 400));
    }
    
    console.log('Processing multiple room images:', {
      fileCount: req.files.length,
      firstFileName: req.files[0].originalname
    });
    
    // Upload images
    const imageUrls = await uploadMultipleRoomImagesUtil(roomId, req.files);
    
    console.log('Multiple images uploaded successfully:', {
      count: imageUrls.length,
      urls: imageUrls.map(url => url.substring(0, 30) + '...').join(', ')
    });
    
    // Update room with new image URLs
    let images = Array.isArray(room.images) ? [...room.images] : [];
    
    // Filter out duplicates
    for (const url of imageUrls) {
      if (!images.includes(url)) {
        images.push(url);
      }
    }
    
    console.log('Updating room with new images:', {
      roomId: roomId,
      previousCount: (room.images || []).length,
      newCount: images.length,
      added: imageUrls.length
    });
    
    // Set the main image if none exists
    const updateData = { images };
    if (!room.image_url && imageUrls.length > 0) {
      updateData.image_url = imageUrls[0];
      console.log('Setting main image from batch upload:', {
        image_url: updateData.image_url.substring(0, 50) + '...'
      });
    }
    
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
