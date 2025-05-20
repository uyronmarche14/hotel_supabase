/**
 * Admin Booking Controller
 * Handles administrative operations on bookings
 */

const { supabaseClient } = require('../../config/supabase');
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
    
    // Build query for count - use select with count option instead of count()
    let countQuery = supabaseClient.from('bookings').select('*', { count: 'exact', head: true });
    
    // Apply filters to count query if provided
    if (status) {
      countQuery = countQuery.eq('status', status);
    }
    
    if (fromDate) {
      countQuery = countQuery.gte('check_in', fromDate);
    }
    
    if (toDate) {
      countQuery = countQuery.lte('check_out', toDate);
    }
    
    if (userId) {
      countQuery = countQuery.eq('user_id', userId);
    }
    
    if (roomId) {
      countQuery = countQuery.eq('room_id', roomId);
    }
    
    // Execute count query - select with {count: 'exact', head: true} returns different structure than count()
    const { data, count, error: countError } = await countQuery;
      
    if (countError) {
      console.error('Error counting bookings:', countError);
      return next(new AppError(`Database error: ${countError.message}`, 500));
    }
    
    console.log(`Found ${count} total bookings matching filters`);
    
    // Build main query for fetching bookings
    let query = supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          id,
          title,
          image_url,
          category,
          price,
          location
        ),
        users:user_id (
          id,
          name,
          email,
          profile_pic
        )
      `);
    
    // Apply the same filters to the main query
    if (status) {
      query = query.eq('status', status);
    }
    
    if (fromDate) {
      query = query.gte('check_in', fromDate);
    }
    
    if (toDate) {
      query = query.lte('check_out', toDate);
    }
    
    if (userId) {
      query = query.eq('user_id', userId);
    }
    
    if (roomId) {
      query = query.eq('room_id', roomId);
    }
    
    // Add search if provided - match on booking_id or user name/email via users table
    if (searchTerm) {
      query = query.or(`booking_id.ilike.%${searchTerm}%,user_name.ilike.%${searchTerm}%,user_email.ilike.%${searchTerm}%`);
    }
    
    // Add sorting and pagination
    query = query.order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);
    
    // Execute the main query
    const { data: bookings, error } = await query;

    if (error) {
      console.error('Error fetching bookings:', error);
      return next(new AppError(`Database error: ${error.message}`, 500));
    }
    
    console.log(`Successfully fetched ${bookings.length} bookings for page ${page}`);
    
    // Transform and clean data for frontend compatibility
    const bookingsResponse = bookings.map(booking => {
      // Format dates consistently - YYYY-MM-DD
      const formatDate = (dateString) => {
        if (!dateString) return '';
        try {
          const date = new Date(dateString);
          return date.toISOString().split('T')[0]; // YYYY-MM-DD format
        } catch (e) {
          console.warn(`Invalid date format: ${dateString}`);
          return dateString;
        }
      };
      
      // Calculate nights if not present
      let nightsCount = booking.nights;
      if (!nightsCount && booking.check_in && booking.check_out) {
        try {
          const checkIn = new Date(booking.check_in);
          const checkOut = new Date(booking.check_out);
          const diffTime = Math.abs(checkOut - checkIn);
          nightsCount = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        } catch (e) {
          nightsCount = 1; // Default fallback
        }
      }
      
      // Get clean room data with fallbacks
      const room = booking.rooms || {};
      
      // Get clean user data with fallbacks
      const user = booking.users || {};
      
      // Create a clean booking response object
      return {
        id: booking.id,
        booking_id: booking.booking_id || `BK-${Date.now().toString().slice(-6)}`,
        
        // Room information
        roomId: booking.room_id,
        roomTitle: room.title || 'Unknown Room',
        roomImage: room.image_url || '/images/room-placeholder.jpg',
        roomCategory: room.category || '',
        roomPrice: parseFloat(room.price) || 0,
        roomLocation: room.location || '',
        
        // User information
        userId: booking.user_id,
        userName: user.name || booking.user_name || '',
        userEmail: user.email || booking.user_email || '',
        userProfilePic: user.profile_pic || '/images/default-user.png',
        
        // Booking details
        checkIn: formatDate(booking.check_in),
        checkOut: formatDate(booking.check_out),
        totalPrice: parseFloat(booking.total_price) || 0,
        nights: nightsCount || 1,
        status: booking.status || 'pending',
        paymentMethod: booking.payment_method || 'credit_card',
        paymentStatus: booking.payment_status || 'pending',
        
        // Additional information
        specialRequests: booking.special_requests || '',
        adults: parseInt(booking.adults) || 1,
        children: parseInt(booking.children) || 0,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at || booking.created_at
      };
    });

    // Calculate pagination info
    const totalPages = Math.ceil(count / limit) || 1;

    // Return well-structured response
    return res.status(200).json({
      success: true,
      count: parseInt(count) || 0,
      pagination: {
        currentPage: page,
        totalPages: totalPages,
        totalItems: parseInt(count) || 0,
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
    const { data: updatedBooking, error } = await supabaseClient
      .from('bookings')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
        ),
        users:user_id (
          name,
          email
        )
      `)
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform data for frontend compatibility
    const bookingResponse = {
      id: updatedBooking.id,
      roomId: updatedBooking.room_id,
      roomTitle: updatedBooking.rooms?.title || '',
      roomImage: updatedBooking.rooms?.image_url || '',
      roomCategory: updatedBooking.rooms?.category || '',
      roomPrice: updatedBooking.rooms?.price || 0,
      roomLocation: updatedBooking.rooms?.location || '',
      userId: updatedBooking.user_id,
      userName: updatedBooking.users?.name || '',
      userEmail: updatedBooking.users?.email || '',
      checkIn: updatedBooking.check_in,
      checkOut: updatedBooking.check_out,
      totalPrice: updatedBooking.total_price,
      nights: updatedBooking.nights,
      status: updatedBooking.status,
      paymentMethod: updatedBooking.payment_method,
      specialRequests: updatedBooking.special_requests,
      adults: updatedBooking.adults,
      children: updatedBooking.children,
      createdAt: updatedBooking.created_at,
      updatedAt: updatedBooking.updated_at
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
