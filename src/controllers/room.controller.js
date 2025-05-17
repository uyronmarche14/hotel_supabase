/**
 * Room Controller
 * Handles room-related operations
 */

const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');
const { uploadRoomImage, uploadMultipleRoomImages, deleteRoomImage } = require('../utils/storage/roomStorage');

/**
 * Get all rooms
 */
exports.getAllRooms = async (req, res, next) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count for pagination using the correct Supabase count API
    const { data: countData, error: countError } = await supabaseClient
      .from('rooms')
      .select('*', { count: 'exact', head: true });
      
    // Extract count from the response
    const count = countData ? countData.length : 0;
      
    if (countError) {
      return next(new AppError(countError.message, 500));
    }
    
    // Get rooms with pagination
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
    const roomsResponse = rooms.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: room.price,
      discount: room.discount || 0,
      capacity: room.capacity,
      size: room.size,
      category: room.category,
      location: room.location,
      rating: room.rating || 4.5,
      imageUrl: room.image_url,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.created_at,
      updatedAt: room.updated_at
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      count: count,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: limit
      },
      rooms: roomsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get top rated rooms
 */
exports.getTopRatedRooms = async (req, res, next) => {
  try {
    // Get limit from query parameter or use default
    const limit = parseInt(req.query.limit) || 5;
    console.log(`Fetching top ${limit} rated rooms`);
    
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching top rated rooms:', error);
      return next(new AppError(error.message, 500));
    }

    // Process room data to ensure proper URLs and formats
    const processedRooms = rooms.map(room => {
      // Make sure imageUrl is properly formatted
      if (room.imageUrl && room.imageUrl.startsWith('/images/')) {
        room.imageUrl = `https://placehold.co/600x400/png?text=Room+${room.title}`;
      }
      return room;
    });

    console.log(`Returning ${processedRooms.length} top rated rooms`);

    // Format response in the expected structure
    res.status(200).json({
      success: true,
      count: processedRooms.length,
      data: processedRooms
    });
  } catch (error) {
    console.error('Error in getTopRatedRooms:', error);
    next(new AppError(error.message, 500));
  }
};

/**
 * Get room categories
 */
exports.getRoomCategories = async (req, res, next) => {
  try {
    // Get all rooms to extract categories
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('category')
      .not('category', 'is', null);

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Extract unique categories
    const categories = [...new Set(rooms.map(room => room.category))].filter(Boolean);
    
    console.log('Retrieved categories:', categories);

    // If this is the categories/samples endpoint, get a sample room from each category
    if (req.path.includes('/categories/samples')) {
      // Get one top-rated room from each category
      const categoryPromises = categories.map(async (category) => {
        const { data: categoryRooms, error: categoryError } = await supabaseClient
          .from('rooms')
          .select('*')
          .eq('category', category)
          .order('rating', { ascending: false })
          .limit(1);

        if (categoryError || !categoryRooms || categoryRooms.length === 0) {
          return null;
        }

        return categoryRooms[0];
      });

      const categoryRooms = (await Promise.all(categoryPromises)).filter(Boolean);

      return res.status(200).json({
        success: true,
        data: categoryRooms
      });
    }

    // Otherwise just return the list of categories
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('Error getting room categories:', error);
    next(new AppError(error.message, 500));
  }
};

/**
 * Search rooms
 */
exports.searchRooms = async (req, res, next) => {
  try {
    // Get search parameters from query string
    const { query, location, category, minPrice, maxPrice, capacity } = req.query;
    
    // Get pagination parameters
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Build query
    let roomQuery = supabaseClient
      .from('rooms')
      .select('*');
    
    // Apply filters if provided
    if (query) {
      roomQuery = roomQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    }
    
    if (location) {
      roomQuery = roomQuery.ilike('location', `%${location}%`);
    }
    
    if (category) {
      roomQuery = roomQuery.eq('category', category);
    }
    
    if (minPrice) {
      roomQuery = roomQuery.gte('price', parseFloat(minPrice));
    }
    
    if (maxPrice) {
      roomQuery = roomQuery.lte('price', parseFloat(maxPrice));
    }
    
    if (capacity) {
      roomQuery = roomQuery.gte('capacity', parseInt(capacity));
    }
    
    // Get total count for pagination (need to clone the query)
    const countQuery = roomQuery;
    const { count, error: countError } = await countQuery.count();
    
    if (countError) {
      return next(new AppError(countError.message, 500));
    }
    
    // Execute query with pagination
    const { data: rooms, error } = await roomQuery
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
    const roomsResponse = rooms.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: room.price,
      discount: room.discount || 0,
      capacity: room.capacity,
      size: room.size,
      category: room.category,
      location: room.location,
      rating: room.rating || 4.5,
      imageUrl: room.image_url,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.created_at,
      updatedAt: room.updated_at
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      count: count,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: limit
      },
      filters: {
        query,
        location,
        category,
        minPrice,
        maxPrice,
        capacity
      },
      rooms: roomsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get rooms by category
 */
exports.getRoomsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count for pagination
    const { count, error: countError } = await supabaseClient
      .from('rooms')
      .select('count')
      .eq('category', category);
      
    if (countError) {
      return next(new AppError(countError.message, 500));
    }
    
    // Get rooms with pagination
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('category', category)
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
    const roomsResponse = rooms.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: room.price,
      discount: room.discount || 0,
      capacity: room.capacity,
      size: room.size,
      category: room.category,
      location: room.location,
      rating: room.rating || 4.5,
      imageUrl: room.image_url,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.created_at,
      updatedAt: room.updated_at
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit);

    res.status(200).json({
      success: true,
      count: count,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: limit
      },
      category: category,
      rooms: roomsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Check room availability
 */
exports.checkRoomAvailability = async (req, res, next) => {
  try {
    // Placeholder implementation
    res.status(200).json({
      success: true,
      available: true
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get room by ID
 */
exports.getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: room, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !room) {
      return next(new AppError('Room not found', 404));
    }
    
    // Get room reviews if available
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select('*')
      .eq('room_id', id)
      .order('created_at', { ascending: false });
      
    // Transform data for frontend compatibility
    const roomResponse = {
      id: room.id,
      title: room.title,
      description: room.description,
      price: room.price,
      discount: room.discount || 0,
      capacity: room.capacity,
      size: room.size,
      category: room.category,
      location: room.location,
      rating: room.rating || 4.5,
      imageUrl: room.image_url,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.created_at,
      updatedAt: room.updated_at,
      reviews: !reviewsError ? reviews.map(review => ({
        id: review.id,
        userId: review.user_id,
        userName: review.user_name,
        rating: review.rating,
        comment: review.comment,
        createdAt: review.created_at
      })) : []
    };

    res.status(200).json({
      success: true,
      room: roomResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Create room
 */
exports.createRoom = async (req, res, next) => {
  try {
    console.log('Creating room with data:', req.body);
    console.log('Files received:', req.files ? req.files.length : 'No files');
    
    // Extract all fields from request body
    const {
      title,
      roomNumber,
      description,
      fullDescription,
      price,
      maxOccupancy,
      category,
      type,
      location,
      capacity,
      bedType,
      roomSize,
      viewType,
      rating,
      reviews,
      href,
      isAvailable,
      amenities,
      additionalAmenities,
      features
    } = req.body;
    
    // Parse array fields if they're provided as JSON strings (common with form data)
    const parseArrayField = (field) => {
      if (!field) return [];
      
      if (typeof field === 'string') {
        try {
          // Try to parse as JSON first
          return JSON.parse(field);
        } catch (e) {
          // If not JSON, split by comma
          return field.split(',').map(item => item.trim()).filter(Boolean);
        }
      }
      
      // If it's already an array, return as is
      if (Array.isArray(field)) return field;
      
      // Default to empty array
      return [];
    };
    
    // Parse array fields
    const parsedAmenities = parseArrayField(amenities);
    const parsedAdditionalAmenities = parseArrayField(additionalAmenities);
    const parsedFeatures = parseArrayField(features);
    
    // Create room first to get the ID
    const { data: newRoom, error } = await supabaseClient
      .from('rooms')
      .insert({
        title,
        room_number: roomNumber,
        description,
        full_description: fullDescription,
        price: parseFloat(price) || 0,
        type: type || 'standard',
        category: category || 'standard-room',
        max_occupancy: parseInt(maxOccupancy) || 2,
        capacity: parseInt(capacity) || 1,
        location: location || '',
        bed_type: bedType || 'queen',
        room_size: roomSize || '',
        view_type: viewType || 'city view',
        rating: parseFloat(rating) || 4.5,
        reviews: parseInt(reviews) || 0,
        href: href || '',
        is_available: isAvailable === 'true' || isAvailable === true,
        amenities: parsedAmenities,
        additional_amenities: parsedAdditionalAmenities,
        features: parsedFeatures,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      return next(new AppError(`Failed to create room: ${error.message}`, 500));
    }
    
    // Process uploaded images if available
    let imageUrls = [];
    let mainImageUrl = null;
    
    // Debug request body and files
    console.log('Request body keys:', Object.keys(req.body));
    console.log('Request files:', req.files ? 'Available' : 'Not available');
    
    // Check for binary files in the request
    if (req.files && req.files.length > 0) {
      console.log(`Processing ${req.files.length} files for room ${newRoom.id}:`, 
        req.files.map(f => `${f.originalname} (${f.size} bytes, ${f.mimetype})`))
      
      try {
        // Upload all images
        imageUrls = await uploadMultipleRoomImages(newRoom.id, req.files);
        console.log(`Successfully uploaded ${imageUrls.length} images:`, imageUrls);
        
        // Use the first image as the main image
        mainImageUrl = imageUrls[0];
        
        // Update the room with image URLs
        const { error: updateError } = await supabaseClient
          .from('rooms')
          .update({
            image_url: mainImageUrl,
            images: imageUrls
          })
          .eq('id', newRoom.id);
          
        if (updateError) {
          console.error('Error updating room with image URLs:', updateError);
        } else {
          console.log('Room updated with image URLs successfully');
        }
      } catch (uploadError) {
        console.error('Error uploading room images:', uploadError);
        // Continue with room creation even if image upload fails
      }
    } else {
      // Check if images are coming from another path in the request
      console.log('No files found in req.files. Checking for Blob data...');
      
      // Look for raw binary data that might be in the body directly
      const hasImages = req.body && req.body.images;
      if (hasImages) {
        console.log('Found images in request body. Processing...');
        
        // Convert to array if it's not already
        const imagesToProcess = Array.isArray(req.body.images) ? req.body.images : [req.body.images];
        
        try {
          // Create file objects from the raw data
          const files = imagesToProcess.map((imgData, index) => {
            // Determine file type from base64 or other indicators
            const mimeType = imgData.type || 'image/jpeg';
            const fileName = imgData.name || `image_${index}.jpg`;
            
            return {
              buffer: imgData,
              originalname: fileName,
              mimetype: mimeType
            };
          });
          
          // Upload using the same function
          imageUrls = await uploadMultipleRoomImages(newRoom.id, files);
          console.log(`Successfully processed ${imageUrls.length} images from request body`);
          
          // Use the first image as the main image
          mainImageUrl = imageUrls[0];
          
          // Update the room with image URLs
          await supabaseClient
            .from('rooms')
            .update({
              image_url: mainImageUrl,
              images: imageUrls
            })
            .eq('id', newRoom.id);
        } catch (processError) {
          console.error('Error processing images from request body:', processError);
        }
      } else {
        console.log('No images found in request. Room will be created without images.');
      }
    }
    
    // Get the complete room data
    const { data: room, error: fetchError } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', newRoom.id)
      .single();
    
    if (fetchError) {
      return next(new AppError(`Room created but failed to fetch details: ${fetchError.message}`, 500));
    }
    
    // Transform data for frontend compatibility
    const roomResponse = {
      id: room.id,
      title: room.title,
      description: room.description,
      price: room.price,
      discount: room.discount || 0,
      capacity: room.capacity,
      size: room.size,
      category: room.category,
      location: room.location,
      rating: room.rating || 4.5,
      imageUrl: room.image_url,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.created_at,
      updatedAt: room.updated_at
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
 * Update room
 */
exports.updateRoom = async (req, res, next) => {
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
      amenities
    } = req.body;
    
    // Check if room exists
    const { data: existingRoom, error: findError } = await supabaseClient
      .from('rooms')
      .select('id, image_url, images')
      .eq('id', id)
      .single();
    
    if (findError || !existingRoom) {
      return next(new AppError('Room not found', 404));
    }
    
    // Process amenities if it's a string (from form data)
    let parsedAmenities = amenities;
    if (typeof amenities === 'string') {
      try {
        parsedAmenities = JSON.parse(amenities);
      } catch (e) {
        parsedAmenities = amenities.split(',').map(item => item.trim());
      }
    }
    
    // Update room
    const { data: updatedRoom, error } = await supabaseClient
      .from('rooms')
      .update({
        title,
        description,
        price: parseFloat(price),
        discount: discount ? parseFloat(discount) : 0,
        capacity: parseInt(capacity),
        size: parseFloat(size),
        category,
        location,
        amenities: parsedAmenities || existingRoom.amenities || [],
        featured: req.body.featured === 'true' || req.body.featured === true,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();
    
    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform data for frontend compatibility
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
      rating: updatedRoom.rating || 4.5,
      imageUrl: updatedRoom.image_url,
      images: updatedRoom.images || [],
      amenities: updatedRoom.amenities || [],
      featured: updatedRoom.featured || false,
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
 * Upload single room image
 */
exports.uploadRoomImage = async (req, res, next) => {
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
    const imageUrl = await uploadRoomImage(
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
exports.uploadRoomImages = async (req, res, next) => {
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
    const imageUrls = await uploadMultipleRoomImages(id, req.files);
    
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

/**
 * Delete room
 */
exports.deleteRoom = async (req, res, next) => {
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
    
    // Delete associated images
    try {
      // Delete main image if exists
      if (room.image_url) {
        await deleteRoomImage(room.image_url);
      }
      
      // Delete all images in the images array
      if (room.images && room.images.length > 0) {
        for (const imageUrl of room.images) {
          await deleteRoomImage(imageUrl);
        }
      }
    } catch (deleteError) {
      console.error('Error deleting room images:', deleteError);
      // Continue with room deletion even if image deletion fails
    }
    
    res.status(200).json({
      success: true,
      message: 'Room deleted successfully'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};
