  /**
 * Room Operations Controller
 * Handles create, update, and delete operations for rooms
 */

const { supabaseClient } = require('../../config/supabase');
const { db } = require('../../db');
const { rooms } = require('../../db/schema');
const { eq } = require('drizzle-orm');
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
    const [newRoom] = await db.insert(rooms).values({
      title,
      description,
      price: parseFloat(price),
      discount: discount ? parseFloat(discount) : 0,
      capacity: parseInt(capacity),
      roomSize: size ? `${size} sq m` : undefined, // Mapping size to roomSize text field based on schema
      category,
      location,
      amenities: parsedAmenities,
      featured: featured === 'true' || featured === true,
      imageUrl: image_url,
      images: [],
      createdAt: new Date(), // Drizzle handles Date objects for timestamp
    }).returning();



    // Transform response for frontend compatibility
    const roomResponse = {
      id: newRoom.id,
      title: newRoom.title,
      description: newRoom.description,
      price: newRoom.price,
      discount: newRoom.discount || 0,
      capacity: newRoom.capacity,
      size: parseInt(newRoom.roomSize) || 0, // Converting back if needed, though schema says text
      category: newRoom.category,
      location: newRoom.location,
      amenities: newRoom.amenities || [],
      featured: newRoom.featured || false,
      imageUrl: newRoom.imageUrl,
      images: newRoom.images || [],
      createdAt: newRoom.createdAt
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
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

    if (!room) {
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
    if (size !== undefined) updateData.roomSize = `${size} sq m`; // Mapping size to roomSize
    if (category !== undefined) updateData.category = category;
    if (location !== undefined) updateData.location = location;
    if (amenities !== undefined) updateData.amenities = parsedAmenities;
    if (featured !== undefined) updateData.featured = featured === 'true' || featured === true;
    if (image_url !== undefined) updateData.imageUrl = image_url;
    updateData.updatedAt = new Date();

    // Update room
    const [updatedRoom] = await db
      .update(rooms)
      .set(updateData)
      .where(eq(rooms.id, id))
      .returning();

    // Transform response for frontend compatibility
    const roomResponse = {
      id: updatedRoom.id,
      title: updatedRoom.title,
      description: updatedRoom.description,
      price: updatedRoom.price,
      discount: updatedRoom.discount || 0,
      capacity: updatedRoom.capacity,
      size: parseInt(updatedRoom.roomSize) || 0,
      category: updatedRoom.category,
      location: updatedRoom.location,
      amenities: updatedRoom.amenities || [],
      featured: updatedRoom.featured || false,
      imageUrl: updatedRoom.imageUrl,
      images: updatedRoom.images || [],
      createdAt: updatedRoom.createdAt,
      updatedAt: updatedRoom.updatedAt
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
    
    // Check if room exists
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));
    
    if (!room) {
      return next(new AppError('Room not found', 404));
    }
    
    // Delete room
    await db.delete(rooms).where(eq(rooms.id, id));
    
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

/**
 * Upload room image
 */
const uploadRoomImage = async (req, res, next) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return next(new AppError('Please upload an image', 400));
    }
    
    const file = req.file;
    const fileExt = file.originalname.split('.').pop();
    const fileName = `${id}/${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseClient.storage
      .from('rooms')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: true
      });
      
    if (uploadError) {
      console.error('Upload Error:', uploadError);
      return next(new AppError('Error uploading image: ' + uploadError.message, 500));
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabaseClient.storage
      .from('rooms')
      .getPublicUrl(filePath);
      
    // Update room with new image URL
    const [room] = await db
      .update(rooms)
      .set({ imageUrl: publicUrl })
      .where(eq(rooms.id, id))
      .returning();
    
    res.status(200).json({
      success: true,
      message: 'Image uploaded successfully',
      imageUrl: publicUrl,
      room
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
    
    if (!req.files || req.files.length === 0) {
      return next(new AppError('Please upload images', 400));
    }
    
    const uploadedUrls = [];
    
    // Upload each file
    for (const file of req.files) {
      const fileExt = file.originalname.split('.').pop();
      const fileName = `${id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${fileName}`;
      
      const { data: uploadData, error: uploadError } = await supabaseClient.storage
        .from('rooms')
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          upsert: true
        });
        
      if (!uploadError) {
        const { data: { publicUrl } } = supabaseClient.storage
          .from('rooms')
          .getPublicUrl(filePath);
          
        uploadedUrls.push(publicUrl);
      }
    }
    
    if (uploadedUrls.length === 0) {
      return next(new AppError('Failed to upload any images', 500));
    }
    
    // Get current images
    const [currentRoom] = await db
      .select({ images: rooms.images })
      .from(rooms)
      .where(eq(rooms.id, id));
      
    const currentImages = currentRoom?.images || [];
    const newImages = [...currentImages, ...uploadedUrls];
    
    // Update room
    const [room] = await db
      .update(rooms)
      .set({ images: newImages })
      .where(eq(rooms.id, id))
      .returning();
    
    res.status(200).json({
      success: true,
      message: 'Images uploaded successfully',
      imageUrls: uploadedUrls,
      room
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  createRoom,
  updateRoom,
  deleteRoom,
  uploadRoomImage,
  uploadRoomImages,
  parseArrayField,
  checkRoomAvailability
};
