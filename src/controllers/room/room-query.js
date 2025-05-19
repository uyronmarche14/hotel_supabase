/**
 * Room Query Controller
 * Handles all read operations for rooms
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get all rooms
 */
const getAllRooms = async (req, res, next) => {
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
const getTopRatedRooms = async (req, res, next) => {
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
const getRoomCategories = async (req, res, next) => {
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
    
    // Get rooms count by category
    const categoryCounts = {};
    categories.forEach(category => {
      categoryCounts[category] = rooms.filter(room => room.category === category).length;
    });

    // Get sample images for each category
    const categoryPromises = categories.map(async category => {
      const { data: categoryRooms, error: categoryError } = await supabaseClient
        .from('rooms')
        .select('image_url')
        .eq('category', category)
        .limit(1);

      if (categoryError || !categoryRooms || categoryRooms.length === 0) {
        return {
          name: category,
          count: categoryCounts[category],
          image: null
        };
      }

      return {
        name: category,
        count: categoryCounts[category],
        image: categoryRooms[0].image_url
      };
    });

    const categoryData = await Promise.all(categoryPromises);

    res.status(200).json({
      success: true,
      count: categories.length,
      categories: categoryData
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Search rooms
 */
const searchRooms = async (req, res, next) => {
  try {
    // Get search parameters from query string
    const {
      category,
      minPrice,
      maxPrice,
      location,
      capacity,
      search,
      page = 1,
      limit = 10
    } = req.query;

    // Build query
    let query = supabaseClient.from('rooms').select('*');

    // Apply filters
    if (category) {
      query = query.eq('category', category);
    }

    if (minPrice) {
      query = query.gte('price', minPrice);
    }

    if (maxPrice) {
      query = query.lte('price', maxPrice);
    }

    if (location) {
      query = query.ilike('location', `%${location}%`);
    }

    if (capacity) {
      query = query.gte('capacity', capacity);
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    // Count total results
    const countQuery = query;
    const { data: countData, error: countError } = await countQuery;

    if (countError) {
      return next(new AppError(countError.message, 500));
    }

    const count = countData ? countData.length : 0;

    // Add pagination
    const startIndex = (page - 1) * limit;
    query = query
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    // Execute query
    const { data: rooms, error } = await query;

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
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: count,
        itemsPerPage: parseInt(limit)
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
const getRoomsByCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;

    // Count total results
    const { data: countData, error: countError } = await supabaseClient
      .from('rooms')
      .select('*', { count: 'exact', head: true })
      .eq('category', category);

    if (countError) {
      return next(new AppError(countError.message, 500));
    }

    const count = countData ? countData.length : 0;

    // Get rooms by category with pagination
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
 * Get room by ID
 */
const getRoomById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get room by ID
    const { data: room, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !room) {
      return next(new AppError('Room not found', 404));
    }

    // Get room reviews
    const { data: reviews, error: reviewsError } = await supabaseClient
      .from('reviews')
      .select(`
        *,
        users:user_id (name, profile_pic)
      `)
      .eq('room_id', id)
      .order('created_at', { ascending: false });

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError);
      // Continue without reviews
    }

    // Transform reviews for frontend compatibility
    const formattedReviews = reviews?.map(review => ({
      id: review.id,
      userId: review.user_id,
      userName: review.users?.name || 'Anonymous',
      userProfilePic: review.users?.profile_pic || null,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at
    })) || [];

    // Transform room data for frontend compatibility
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
      reviews: formattedReviews,
      reviewCount: formattedReviews.length
    };

    res.status(200).json({
      success: true,
      room: roomResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getAllRooms,
  getTopRatedRooms,
  getRoomCategories,
  searchRooms,
  getRoomsByCategory,
  getRoomById
};
