/**
 * Room Operations Controller
 * Handles create, update, and delete operations for rooms
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Create room
 */
const createRoom = async (req, res, next) => {
  try {
    const {
      title,
      description,
      price,
      discount,
      capacity,
      size,
      category,
      location,
      amenities,
      featured,
      image_url
    } = req.body;

    // Parse array fields if needed
    const parsedAmenities = parseArrayField(amenities);

    // Create room
    const { data: newRoom, error } = await supabaseClient
      .from('rooms')
      .insert([
        {
          title,
          description,
          price: parseFloat(price),
          discount: discount ? parseFloat(discount) : 0,
          capacity: parseInt(capacity),
          size: parseInt(size),
          category,
          location,
          amenities: parsedAmenities,
          featured: featured === 'true' || featured === true,
          image_url,
          images: [],
          created_at: new Date().toISOString()
        }
      ])
      .select('*')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform response for frontend compatibility
    const roomResponse = {
      id: newRoom.id,
      title: newRoom.title,
      description: newRoom.description,
      price: newRoom.price,
      discount: newRoom.discount || 0,
      capacity: newRoom.capacity,
      size: newRoom.size,
      category: newRoom.category,
      location: newRoom.location,
      amenities: newRoom.amenities || [],
      featured: newRoom.featured || false,
      imageUrl: newRoom.image_url,
      images: newRoom.images || [],
      createdAt: newRoom.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Room created successfully',
      room: roomResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Parse array fields if they're provided as JSON strings (common with form data)
 */
const parseArrayField = (field) => {
  if (!field) return [];
  
  // Already an array
  if (Array.isArray(field)) {
    return field;
  }
  
  // JSON string
  try {
    return JSON.parse(field);
  } catch (error) {
    // Split by comma if it's a comma-separated string
    if (typeof field === 'string') {
      return field.split(',').map(item => item.trim()).filter(Boolean);
    }
    
    return [];
  }
};

/**
 * Update room
 */
const updateRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      price,
      discount,
      capacity,
      size,
      category,
      location,
      amenities,
      featured,
      image_url
    } = req.body;

    // Check if room exists
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !room) {
      return next(new AppError('Room not found', 404));
    }

    // Parse array fields if needed
    const parsedAmenities = parseArrayField(amenities);

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (discount !== undefined) updateData.discount = parseFloat(discount);
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (size !== undefined) updateData.size = parseInt(size);
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location;
    if (amenities !== undefined) updateData.amenities = parsedAmenities;
    if (featured !== undefined) updateData.featured = featured === 'true' || featured === true;
    if (image_url !== undefined) updateData.image_url = image_url;
    updateData.updated_at = new Date().toISOString();

    // Update room
    const { data: updatedRoom, error } = await supabaseClient
      .from('rooms')
      .update(updateData)
      .eq('id', id)
      .select('*')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform response for frontend compatibility
    const roomResponse = {
      id: updatedRoom.id,
      title: updatedRoom.title,
      description: updatedRoom.description,
      price: updatedRoom.price,
      discount: updatedRoom.discount || 0,
      capacity: updatedRoom.capacity,
      size: updatedRoom.size,
      category: updatedRoom.category,
      location: updatedRoom.location,
      amenities: updatedRoom.amenities || [],
      featured: updatedRoom.featured || false,
      imageUrl: updatedRoom.image_url,
      images: updatedRoom.images || [],
      createdAt: updatedRoom.created_at,
      updatedAt: updatedRoom.updated_at
    };

    res.status(200).json({
      success: true,
      message: 'Room updated successfully',
      room: roomResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Delete room
 */
const deleteRoom = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    // Check if room exists and get images for deletion
    const { data: room, error: findError } = await supabaseClient
      .from('rooms')
      .select('id, image_url, images')
      .eq('id', id)
      .single();
    
    if (findError || !room) {
      return next(new AppError('Room not found', 404));
    }
    
    // Delete room
    const { error } = await supabaseClient
      .from('rooms')
      .delete()
      .eq('id', id);
    
    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Check room availability
 */
const checkRoomAvailability = async (req, res, next) => {
  try {
    // Implementation will be added to the availability module
    next(new AppError('This method has been moved to the availability module', 500));
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  createRoom,
  updateRoom,
  deleteRoom,
  parseArrayField,
  checkRoomAvailability
};
