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
      discount, // Not used - removed in database insert
      capacity,
      size,
      category,
      location,
      amenities,
      featured, // Not used - missing from schema
      image_url
    } = req.body;

    // Parse array fields if needed
    const parsedAmenities = parseArrayField(amenities);

    // Create room with fields matching exactly the database schema (snake_case)
    const { data: newRoom, error } = await supabaseClient
      .from('rooms')
      .insert([
        {
          title,
          room_number: req.body.roomNumber || req.body.room_number,
          type: req.body.type || 'standard',
          description,
          full_description: req.body.fullDescription || req.body.full_description || '',
          price: parseFloat(price),
          capacity: parseInt(capacity),
          room_size: req.body.roomSize || req.body.room_size || '30 sq m', // Using room_size instead of size
          category,
          location,
          amenities: parsedAmenities,
          additional_amenities: parseArrayField(req.body.additionalAmenities || req.body.additional_amenities),
          features: parseArrayField(req.body.features),
          bed_type: req.body.bedType || req.body.bed_type || 'Queen',
          view_type: req.body.viewType || req.body.view_type || 'City view',
          is_available: req.body.isAvailable !== undefined ? req.body.isAvailable : true,
          image_url,
          images: [],
          href: req.body.href || '',
          created_at: new Date().toISOString()
        }
      ])
      .select('*')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform response for frontend compatibility with camelCase field names
    const roomResponse = {
      id: newRoom.id,
      title: newRoom.title,
      roomNumber: newRoom.room_number,
      type: newRoom.type,
      description: newRoom.description,
      fullDescription: newRoom.full_description,
      price: newRoom.price,
      capacity: newRoom.capacity,
      maxOccupancy: newRoom.max_occupancy,
      roomSize: newRoom.room_size,
      category: newRoom.category,
      location: newRoom.location,
      amenities: newRoom.amenities || [],
      additionalAmenities: newRoom.additional_amenities || [],
      features: newRoom.features || [],
      bedType: newRoom.bed_type,
      viewType: newRoom.view_type,
      isAvailable: newRoom.is_available,
      href: newRoom.href,
      rating: newRoom.rating,
      reviews: newRoom.reviews,
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

    // Prepare update data with schema-matching field names
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (req.body.roomNumber !== undefined) updateData.room_number = req.body.roomNumber;
    if (req.body.type !== undefined) updateData.type = req.body.type;
    if (description !== undefined) updateData.description = description;
    if (req.body.fullDescription !== undefined) updateData.full_description = req.body.fullDescription;
    if (price !== undefined) updateData.price = parseFloat(price);
    if (capacity !== undefined) updateData.capacity = parseInt(capacity);
    if (req.body.maxOccupancy !== undefined) updateData.max_occupancy = parseInt(req.body.maxOccupancy);
    
    // Use room_size instead of size
    if (req.body.roomSize !== undefined) updateData.room_size = req.body.roomSize;
    
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location;
    if (amenities !== undefined) updateData.amenities = parsedAmenities;
    if (req.body.additionalAmenities !== undefined) {
      updateData.additional_amenities = parseArrayField(req.body.additionalAmenities);
    }
    if (req.body.features !== undefined) {
      updateData.features = parseArrayField(req.body.features);
    }
    if (req.body.bedType !== undefined) updateData.bed_type = req.body.bedType;
    if (req.body.viewType !== undefined) updateData.view_type = req.body.viewType;
    if (req.body.isAvailable !== undefined) updateData.is_available = req.body.isAvailable;
    if (req.body.rating !== undefined) updateData.rating = parseFloat(req.body.rating);
    if (req.body.reviews !== undefined) updateData.reviews = parseInt(req.body.reviews);
    if (req.body.href !== undefined) updateData.href = req.body.href;
    // Log all image-related fields in the request body for debugging
    console.log('Image fields in request:', {
      image_url_from_destructured: image_url !== undefined,
      image_url_from_body: req.body.image_url !== undefined,
      imageUrl_from_body: req.body.imageUrl !== undefined,
      images_array: Array.isArray(req.body.images) ? req.body.images.length : 'not array'
    });
    
    // Accept image_url from either snake_case or camelCase format
    if (image_url !== undefined) {
      updateData.image_url = image_url;
      console.log('Using destructured image_url:', image_url.substring(0, 50) + '...');
    } else if (req.body.image_url !== undefined) {
      updateData.image_url = req.body.image_url;
      console.log('Using direct req.body.image_url:', req.body.image_url.substring(0, 50) + '...');
    } else if (req.body.imageUrl !== undefined) {
      updateData.image_url = req.body.imageUrl;
      console.log('Using camelCase req.body.imageUrl:', req.body.imageUrl.substring(0, 50) + '...');
    }
    
    // Make sure to also handle images array
    if (req.body.images !== undefined) {
      updateData.images = Array.isArray(req.body.images) ? req.body.images : [];
      console.log('Setting images array with', updateData.images.length, 'items');
    }
    
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

    // Transform response for frontend compatibility with camelCase field names
    const roomResponse = {
      id: updatedRoom.id,
      title: updatedRoom.title,
      roomNumber: updatedRoom.room_number,
      type: updatedRoom.type,
      description: updatedRoom.description,
      fullDescription: updatedRoom.full_description,
      price: updatedRoom.price,
      capacity: updatedRoom.capacity,
      maxOccupancy: updatedRoom.max_occupancy,
      roomSize: updatedRoom.room_size,
      category: updatedRoom.category,
      location: updatedRoom.location,
      amenities: updatedRoom.amenities || [],
      additionalAmenities: updatedRoom.additional_amenities || [],
      features: updatedRoom.features || [],
      bedType: updatedRoom.bed_type,
      viewType: updatedRoom.view_type,
      isAvailable: updatedRoom.is_available,
      href: updatedRoom.href,
      rating: updatedRoom.rating,
      reviews: updatedRoom.reviews,
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
