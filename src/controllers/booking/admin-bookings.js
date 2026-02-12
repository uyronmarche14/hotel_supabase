/**
 * Admin Booking Controller
 * Handles administrative operations on bookings
 */

const { db } = require('../../db');
const { bookings, rooms, users } = require('../../db/schema');
const { count, desc, eq, and, or, ilike, gte, lte } = require('drizzle-orm');
const AppError = require('../../utils/appError');

/**
 * Get all bookings (admin only)
 */
const getAllBookings = async (req, res, next) => {
  try {
    console.log('Admin fetching all bookings');
    
    // Get pagination and filter parameters from query string with validation
    const page = Math.max(parseInt(req.query.page) || 1, 1); // Ensure minimum page is 1
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 10, 5), 50); // Between 5 and 50
    const startIndex = (page - 1) * limit;
    
    // Get filter parameters
    const status = req.query.status || null;
    const fromDate = req.query.fromDate || null;
    const toDate = req.query.toDate || null;
    const userId = req.query.userId || null;
    const roomId = req.query.roomId || null;
    const searchTerm = req.query.search || null;
    
    // Build filters
    const filters = [];
    
    if (status) {
      filters.push(eq(bookings.status, status));
    }
    
    if (fromDate) {
      filters.push(gte(bookings.checkIn, new Date(fromDate)));
    }
    
    if (toDate) {
      filters.push(lte(bookings.checkOut, new Date(toDate)));
    }
    
    if (userId) {
      filters.push(eq(bookings.userId, userId));
    }
    
    if (roomId) {
      filters.push(eq(bookings.roomId, roomId));
    }
    
    if (searchTerm) {
      filters.push(or(
        ilike(bookings.bookingId, `%${searchTerm}%`),
        ilike(bookings.firstName, `%${searchTerm}%`),
        ilike(bookings.lastName, `%${searchTerm}%`),
        ilike(bookings.email, `%${searchTerm}%`)
      ));
    }
    
    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Count total bookings
    const [countResult] = await db
      .select({ count: count() })
      .from(bookings)
      .leftJoin(users, eq(bookings.userId, users.id)) // Join needed if we filter by user fields? 
      // Actually my search filter uses bookings fields (firstName, lastName copied to booking).
      // But if search matches user table fields not in booking (like profilePic?), we might need join.
      // Current search logic in original code: user_name, user_email.
      // Drizzle schema has firstName, lastName, email in bookings table.
      // So simple query on bookings table is enough for search.
      .where(whereClause);
      
    const totalCount = countResult?.count || 0;
    
    console.log(`Found ${totalCount} total bookings matching filters`);
    
    // Fetch bookings with relations
    const bookingsData = await db
      .select({
        booking: bookings,
        room: rooms,
        user: users
      })
      .from(bookings)
      .leftJoin(rooms, eq(bookings.roomId, rooms.id))
      .leftJoin(users, eq(bookings.userId, users.id))
      .where(whereClause)
      .orderBy(desc(bookings.createdAt))
      .limit(limit)
      .offset(startIndex);

    console.log(`Successfully fetched ${bookingsData.length} bookings for page ${page}`);
    
    // Transform and clean data for frontend compatibility
    const bookingsResponse = bookingsData.map(({ booking, room, user }) => {
      // Format dates consistently - YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return '';
        try {
          return new Date(date).toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (e) {
          console.warn(`Invalid date format: ${date}`);
          return '';
        }
      };
      
      // Calculate nights if not present
      let nightsCount = booking.nights;
      if (!nightsCount && booking.checkIn && booking.checkOut) {
        try {
          const checkIn = new Date(booking.checkIn);
          const checkOut = new Date(booking.checkOut);
          const diffTime = Math.abs(checkOut - checkIn);
          nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (e) {
          nightsCount = 1; // Default fallback
        }
      }
      
      // Create a clean booking response object
      return {
        id: booking.id,
        booking_id: booking.bookingId || `BK-${Date.now().toString().slice(-6)}`,
        
        // Room information
        roomId: booking.roomId,
        roomTitle: room?.title || booking.roomTitle || 'Unknown Room',
        roomImage: room?.imageUrl || booking.roomImage || '/images/room-placeholder.jpg',
        roomCategory: room?.category || booking.roomCategory || '',
        roomPrice: room?.price ? parseFloat(room.price) : (parseFloat(booking.totalPrice) / (nightsCount || 1)),
        roomLocation: room?.location || booking.location || '',
        
        // User information
        userId: booking.userId,
        userName: user?.name || `${booking.firstName} ${booking.lastName}`.trim() || '',
        userEmail: user?.email || booking.email || '',
        userProfilePic: user?.profilePic || '/images/default-user.png',
        
        // Booking details
        checkIn: formatDate(booking.checkIn),
        checkOut: formatDate(booking.checkOut),
        totalPrice: parseFloat(booking.totalPrice) || 0,
        nights: nightsCount || 1,
        status: booking.status || 'pending',
        // paymentMethod: booking.paymentMethod || 'credit_card', // Not in schema
        paymentStatus: booking.paymentStatus || 'pending',
        
        // Additional information
        specialRequests: booking.specialRequests || '',
        adults: parseInt(booking.adults) || 1,
        children: 0, // Schema: guests is integer
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt || booking.createdAt
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // Return well-structured response
    return res.status(200).json({
      success: true,
      count: parseInt(totalCount) || 0,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: parseInt(totalCount) || 0,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      bookings: bookingsResponse
    });
  } catch (error) {
    console.error('Unexpected error in getAllBookings:', error);
    next(new AppError(`Server error: ${error.message}`, 500));
  }
};

/**
 * Update booking status (admin only)
 */
const updateBookingStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['pending', 'confirmed', 'cancelled', 'completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Valid status is required'
      });
    }

    // Update booking status
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status,
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();

    if (!updatedBooking) {
        return next(new AppError('Booking not found or update failed', 404));
    }

    // Fetch related updated data
    const [result] = await db
        .select({
            booking: bookings,
            room: rooms,
            user: users
        })
        .from(bookings)
        .leftJoin(rooms, eq(bookings.roomId, rooms.id))
        .leftJoin(users, eq(bookings.userId, users.id))
        .where(eq(bookings.id, id));

    const { booking, room, user } = result;

    // Transform data for frontend compatibility
    const bookingResponse = {
      id: booking.id,
      roomId: booking.roomId,
      roomTitle: room?.title || booking.roomTitle || '',
      roomImage: room?.imageUrl || booking.roomImage || '',
      roomCategory: room?.category || booking.roomCategory || '',
      roomPrice: room?.price ? parseFloat(room.price) : 0,
      roomLocation: room?.location || booking.location || '',
      userId: booking.userId,
      userName: user?.name || `${booking.firstName} ${booking.lastName}` || '',
      userEmail: user?.email || booking.email || '',
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      totalPrice: parseFloat(booking.totalPrice) || 0,
      nights: booking.nights,
      status: booking.status,
      // paymentMethod: booking.paymentMethod,
      specialRequests: booking.specialRequests,
      adults: booking.adults,
      children: 0,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'Booking status updated successfully',
      booking: bookingResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getAllBookings,
  updateBookingStatus
};
