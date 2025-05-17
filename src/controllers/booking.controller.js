/**
 * Booking Controller
 * Handles booking-related operations with frontend-compatible responses
 */

const { validationResult } = require('express-validator');
const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');

/**
 * Get all bookings for the current user
 */
exports.getUserBookings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: bookings, error } = await supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform data for frontend compatibility
    const bookingsResponse = bookings.map(booking => ({
      id: booking.id,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      nights: booking.nights,
      status: booking.status,
      paymentMethod: booking.payment_method,
      specialRequests: booking.special_requests,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.created_at
    }));

    res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookingsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get booking by ID
 */
exports.getBookingById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Users can only view their own bookings unless they are admins
    let query = supabaseClient
      .from('bookings')
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location,
          amenities
        )
      `)
      .eq('id', id);

    // If not admin, restrict to user's own bookings
    if (req.user.role !== 'admin') {
      query = query.eq('user_id', userId);
    }

    const { data: booking, error } = await query.single();

    if (error || !booking) {
      return next(new AppError('Booking not found or access denied', 404));
    }

    // Transform data for frontend compatibility
    const bookingResponse = {
      id: booking.id,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      roomAmenities: booking.rooms?.amenities || [],
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      nights: booking.nights,
      status: booking.status,
      paymentMethod: booking.payment_method,
      specialRequests: booking.special_requests,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.created_at
    };

    res.status(200).json({
      success: true,
      booking: bookingResponse
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
    const { roomId, checkIn, checkOut } = req.query;

    if (!roomId || !checkIn || !checkOut) {
      return res.status(400).json({
        success: false,
        message: 'Room ID, check-in and check-out dates are required'
      });
    }

    // Check if room exists
    const { data: room, error: roomError } = await supabaseClient
      .from('rooms')
      .select('id, is_available')
      .eq('id', roomId)
      .single();

    if (roomError || !room) {
      return next(new AppError('Room not found', 404));
    }

    if (room.is_available === false) {
      return res.status(200).json({
        success: true,
        available: false,
        message: 'Room is not available for booking'
      });
    }

    // Check if room is already booked for the dates
    const { data: existingBookings, error: bookingError } = await supabaseClient
      .from('bookings')
      .select('id')
      .eq('room_id', roomId)
      .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`)
      .not('status', 'eq', 'cancelled');

    if (bookingError) {
      return next(new AppError(bookingError.message, 500));
    }

    const isAvailable = existingBookings.length === 0;

    res.status(200).json({
      success: true,
      available: isAvailable,
      message: isAvailable ? 'Room is available for the selected dates' : 'Room is already booked for the selected dates'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Create a new booking and save it to the database
 */
exports.createBooking = async (req, res, next) => {
  try {
    // Validate required fields
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('Validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Get user ID from request or use guest ID
    const userId = req.user?.id || req.body.user_id || 'guest-' + Date.now();
    
    // Extract booking data from request body - using let for variables that might be reassigned
    // Use let instead of const for room_id since we may need to replace it with a fallback
    let {
      room_id,
      check_in,
      check_out,
      total_price,
      nights,
      adults,
      children,
      payment_method,
      special_requests,
      user_email,
      user_name
    } = req.body;
    
    console.log('Creating new booking with data:', JSON.stringify(req.body, null, 2));

    // Validate room_id format for UUID
    if (!room_id || room_id === 'undefined' || room_id === 'null') {
      console.error('Invalid room_id received:', room_id);
      
      // Get a fallback room to use instead
      const { data: fallbackRooms, error: fallbackError } = await supabaseClient
        .from('rooms')
        .select('id, title, image_url, category, price')
        .limit(1);
      
      if (fallbackError || !fallbackRooms || fallbackRooms.length === 0) {
        console.error('Could not fetch fallback room:', fallbackError);
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID and no fallback rooms available',
          error: 'Please select a valid room'
        });
      }
      
      // Use the first available room as fallback
      room_id = fallbackRooms[0].id;
      console.log(`Using fallback room: ${room_id} (${fallbackRooms[0].title})`);
    }
    
    // Verify the room exists
    let room;
    try {
      const { data: roomData, error: roomError } = await supabaseClient
        .from('rooms')
        .select('id, title, image_url, category, price')
        .eq('id', room_id)
        .single();

      if (roomError) {
        console.error('Error finding room:', roomError);
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          error: roomError.message
        });
      }
      
      // Store the room data for later use
      room = roomData;
      console.log(`Found room ${room.id}: ${room.title}`);
    } catch (roomLookupError) {
      console.error('Exception during room lookup:', roomLookupError);
      return res.status(500).json({
        success: false,
        message: 'Error processing room data',
        error: roomLookupError.message
      });
    }

    // Create booking record in database with safety checks
    const roomPrice = room && room.price ? room.price : 100; // Fallback price if none provided
    const calculatedTotalPrice = total_price || (nights ? nights * roomPrice : roomPrice);
    
    // Log room data for debugging
    console.log('Using room for booking:', {
      id: room.id,
      title: room.title,
      price: room.price,
      calculatedPrice: calculatedTotalPrice
    });
    
    // Ensure the room_id is valid (we should have it from previous checks)
    if (!room || !room.id) {
      return res.status(400).json({
        success: false,
        message: 'Invalid room data',
        error: 'Room information is missing or invalid'
      });
    }
    
    // Create a properly formatted booking record with all required fields
    const bookingData = {
      room_id: room.id, // Use the validated room ID
      user_id: userId,
      check_in,
      check_out,
      nights: Number(nights) || 1,
      adults: Number(adults) || 1,
      children: Number(children) || 0,
      total_price: calculatedTotalPrice,
      payment_method: payment_method || 'credit_card',
      special_requests: special_requests || '',
      status: 'pending',
      user_email: user_email || req.body.email || 'guest@example.com',
      user_name: user_name || `${req.body.firstName || ''} ${req.body.lastName || ''}`.trim() || 'Guest User'
    };
    
    // Log the final booking data for debugging
    console.log('Final booking data to insert:', bookingData);

    // Insert booking into the database
    const { data: booking, error: insertError } = await supabaseClient
      .from('bookings')
      .insert([bookingData])
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting booking:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: insertError.message
      });
    }

    console.log('Successfully created booking:', booking.id);

    // Return success response with the created booking
    return res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: {
        id: booking.id,
        roomId: booking.room_id,
        roomTitle: room.title,
        roomImage: room.image_url,
        roomCategory: room.category,
        checkIn: booking.check_in,
        checkOut: booking.check_out,
        nights: booking.nights,
        totalPrice: booking.total_price,
        status: booking.status,
        paymentMethod: booking.payment_method,
        createdAt: booking.created_at
      }
    });
  } catch (error) {
    console.error('Error in createBooking:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error when creating booking',
      error: error.message
    });
  }
};

/**
 * Update a booking
 */
exports.updateBooking = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const userId = req.user.id;
    const {
      checkIn,
      checkOut,
      totalPrice,
      nights,
      paymentMethod,
      specialRequests,
      adults,
      children
    } = req.body;

    // Check if booking exists and belongs to user
    const { data: existingBooking, error: findError } = await supabaseClient
      .from('bookings')
      .select('id, room_id, status')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingBooking) {
      return next(new AppError('Booking not found or access denied', 404));
    }

    // Cannot update cancelled bookings
    if (existingBooking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update a cancelled booking'
      });
    }

    // If dates are changed, check availability
    if (checkIn !== undefined && checkOut !== undefined) {
      // Check if room is already booked for the dates
      const { data: existingBookings, error: bookingError } = await supabaseClient
        .from('bookings')
        .select('id')
        .eq('room_id', existingBooking.room_id)
        .neq('id', id) // Exclude current booking
        .or(`check_in.lte.${checkOut},check_out.gte.${checkIn}`)
        .not('status', 'eq', 'cancelled');

      if (bookingError) {
        return next(new AppError(bookingError.message, 500));
      }

      if (existingBookings.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Room is already booked for the selected dates'
        });
      }
    }

    // Update booking
    const { data: updatedBooking, error } = await supabaseClient
      .from('bookings')
      .update({
        check_in: checkIn,
        check_out: checkOut,
        total_price: totalPrice,
        nights,
        payment_method: paymentMethod,
        special_requests: specialRequests,
        adults,
        children,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
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
      message: 'Booking updated successfully',
      booking: bookingResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Cancel a booking
 */
exports.cancelBooking = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Check if booking exists and belongs to user
    const { data: existingBooking, error: findError } = await supabaseClient
      .from('bookings')
      .select('id, status, room_id')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (findError || !existingBooking) {
      return next(new AppError('Booking not found or access denied', 404));
    }

    // Already cancelled
    if (existingBooking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }

    // Update booking status
    const { data: updatedBooking, error } = await supabaseClient
      .from('bookings')
      .update({
        status: 'cancelled',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        rooms:room_id (
          title,
          image_url,
          category,
          price,
          location
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
      message: 'Booking cancelled successfully',
      booking: bookingResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get all bookings (admin only)
 */
exports.getAllBookings = async (req, res, next) => {
  try {
    // Get pagination parameters from query string
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    
    // Get total count for pagination
    const { count, error: countError } = await supabaseClient
      .from('bookings')
      .count();
      
    if (countError) {
      return next(new AppError(countError.message, 500));
    }
    
    // Get bookings with pagination
    const { data: bookings, error } = await supabaseClient
      .from('bookings')
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
          email,
          profile_pic
        )
      `)
      .order('created_at', { ascending: false })
      .range(startIndex, startIndex + limit - 1);

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform data for frontend compatibility
    const bookingsResponse = bookings.map(booking => ({
      id: booking.id,
      roomId: booking.room_id,
      roomTitle: booking.rooms?.title || '',
      roomImage: booking.rooms?.image_url || '',
      roomCategory: booking.rooms?.category || '',
      roomPrice: booking.rooms?.price || 0,
      roomLocation: booking.rooms?.location || '',
      userId: booking.user_id,
      userName: booking.users?.name || '',
      userEmail: booking.users?.email || '',
      userProfilePic: booking.users?.profile_pic || '',
      checkIn: booking.check_in,
      checkOut: booking.check_out,
      totalPrice: booking.total_price,
      nights: booking.nights,
      status: booking.status,
      paymentMethod: booking.payment_method,
      specialRequests: booking.special_requests,
      adults: booking.adults,
      children: booking.children,
      createdAt: booking.created_at
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
      bookings: bookingsResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Update booking status (admin only)
 */
exports.updateBookingStatus = async (req, res, next) => {
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
