/**
 * Room Query Controller
 * Handles all read operations for rooms
 */

const { db } = require('../../db');
const { rooms, reviews, users } = require('../../db/schema');
const { count, desc, eq, ilike, or, and, gte, lte, sql } = require('drizzle-orm');
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
    
    // Get total count
    const [countResult] = await db.select({ count: count() }).from(rooms);
    const totalCount = countResult?.count || 0;

    // Get rooms with pagination
    const roomsData = await db
      .select()
      .from(rooms)
      .orderBy(desc(rooms.createdAt))
      .limit(limit)
      .offset(startIndex);

    // Transform data for frontend compatibility
    const roomsResponse = roomsData.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: parseFloat(room.price),
      discount: parseFloat(room.discount) || 0,
      capacity: room.capacity,
      size: parseInt(room.roomSize) || 0,
      category: room.category,
      location: room.location,
      rating: parseFloat(room.rating) || 4.5,
      reviews: 0, // Placeholder for valid usage like room.reviews || 0
      imageUrl: room.imageUrl,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      count: totalCount,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCount,
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
    
    const roomsData = await db
      .select()
      .from(rooms)
      .orderBy(desc(rooms.rating))
      .limit(limit);

    // Process room data to ensure proper URLs and formats
    const processedRooms = roomsData.map(room => {
      const processedRoom = {
        ...room,
        imageUrl: room.imageUrl,
        createdAt: room.createdAt,
        updatedAt: room.updatedAt,
        size: parseInt(room.roomSize) || 0,
        price: parseFloat(room.price),
        discount: parseFloat(room.discount) || 0,
        rating: parseFloat(room.rating) || 4.5
      };
      
      // Make sure imageUrl is properly formatted
      if (processedRoom.imageUrl && processedRoom.imageUrl.startsWith('/images/')) {
        processedRoom.imageUrl = `https://placehold.co/600x400/png?text=Room+${encodeURIComponent(room.title)}`;
      }
      return processedRoom;
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
    // Get all rooms to extract categories
    const allRooms = await db
      .select({ category: rooms.category })
      .from(rooms)
      .where(sql`${rooms.category} IS NOT NULL`);

    // Extract unique categories
    const categories = [...new Set(allRooms.map(room => room.category))].filter(Boolean);
    
    // Get rooms count by category
    const categoryCounts = {};
    categories.forEach(category => {
      categoryCounts[category] = allRooms.filter(room => room.category === category).length;
    });

    // Get sample images for each category
    const categoryPromises = categories.map(async category => {
      const [categoryRoom] = await db
        .select({ imageUrl: rooms.imageUrl })
        .from(rooms)
        .where(eq(rooms.category, category))
        .limit(1);

      return {
        name: category,
        count: categoryCounts[category],
        image: categoryRoom ? categoryRoom.imageUrl : null
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

    // Build filters
    const filters = [];

    if (category) {
      filters.push(eq(rooms.category, category));
    }

    if (minPrice) {
      filters.push(gte(rooms.price, minPrice));
    }

    if (maxPrice) {
      filters.push(lte(rooms.price, maxPrice));
    }

    if (location) {
      filters.push(ilike(rooms.location, `%${location}%`));
    }

    if (capacity) {
      filters.push(gte(rooms.capacity, capacity));
    }

    if (search) {
      filters.push(or(
        ilike(rooms.title, `%${search}%`),
        ilike(rooms.description, `%${search}%`)
      ));
    }

    // Apply filters
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Count total results
    const [countResult] = await db
      .select({ count: count() })
      .from(rooms)
      .where(whereClause);

    const totalCount = countResult?.count || 0;

    // Add pagination
    const startIndex = (page - 1) * limit;

    // Execute query
    const roomsData = await db
      .select()
      .from(rooms)
      .where(whereClause)
      .orderBy(desc(rooms.createdAt))
      .limit(limit)
      .offset(startIndex);

    // Transform data for frontend compatibility
    const roomsResponse = roomsData.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: parseFloat(room.price),
      discount: parseFloat(room.discount) || 0,
      capacity: room.capacity,
      size: parseInt(room.roomSize) || 0,
      category: room.category,
      location: room.location,
      rating: parseFloat(room.rating) || 4.5,
      reviews: 0,
      imageUrl: room.imageUrl,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      count: totalCount,
      pagination: {
        currentPage: parseInt(page),
        totalPages: totalPages,
        totalItems: totalCount,
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
    const [countResult] = await db
      .select({ count: count() })
      .from(rooms)
      .where(eq(rooms.category, category));

    const totalCount = countResult?.count || 0;

    // Get rooms by category with pagination
    const roomsData = await db
      .select()
      .from(rooms)
      .where(eq(rooms.category, category))
      .orderBy(desc(rooms.createdAt))
      .limit(limit)
      .offset(startIndex);

    // Transform data for frontend compatibility
    const roomsResponse = roomsData.map(room => ({
      id: room.id,
      title: room.title,
      description: room.description,
      price: parseFloat(room.price),
      discount: parseFloat(room.discount) || 0,
      capacity: room.capacity,
      size: parseInt(room.roomSize) || 0,
      category: room.category,
      location: room.location,
      rating: parseFloat(room.rating) || 4.5,
      reviews: 0,
      imageUrl: room.imageUrl,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt
    }));

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      success: true,
      count: totalCount,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: totalCount,
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
    const [room] = await db.select().from(rooms).where(eq(rooms.id, id));

    if (!room) {
      return next(new AppError('Room not found', 404));
    }

    // Get room reviews (if we had a reviews table)
    // Note: Reviews table isn't fully defined in schema.js provided, skipping unless added
    const formattedReviews = [];

    // Transform room data for frontend compatibility
    const roomResponse = {
      id: room.id,
      title: room.title,
      description: room.description,
      price: parseFloat(room.price),
      discount: parseFloat(room.discount) || 0,
      capacity: room.capacity,
      size: parseInt(room.roomSize) || 0,
      category: room.category,
      location: room.location,
      rating: parseFloat(room.rating) || 4.5,
      imageUrl: room.imageUrl,
      images: room.images || [],
      amenities: room.amenities || [],
      featured: room.featured || false,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
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
