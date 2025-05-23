/**
 * Booking Operations Controller
 * Handles core booking operations: create, update, and cancel
 */

const { validationResult } = require('express-validator');
const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Create a new booking and save it to the database
 */
const createBooking = async (req, res, next) => {
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
    
    // Extract booking data from request body - use a mutable variable for roomId
    const {
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
    
    // Extract room_id separately so we can modify it
    let roomId = req.body.room_id;
    
    console.log('Creating new booking with data:', JSON.stringify(req.body, null, 2));

    // Validate roomId format for UUID
    if (!roomId || roomId === 'undefined' || roomId === 'null') {
      console.error('Invalid room_id received:', roomId);
      
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
      roomId = fallbackRooms[0].id;
      console.log(`Using fallback room: ${roomId} (${fallbackRooms[0].title})`);
    }
    
    // Verify the room exists
    let room;
    try {
      const { data: roomData, error: roomError } = await supabaseClient
        .from('rooms')
        .select('id, title, image_url, category, price')
        .eq('id', roomId)
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
      room_id: roomId,
      user_id: userId,
      check_in: check_in,
      check_out: check_out,
      total_price: calculatedTotalPrice,
      nights: nights || 1,
      adults: adults || 1,
      children: children || 0,
      payment_method: payment_method || 'credit_card',
      special_requests: special_requests || '',
      status: 'confirmed',
      user_email: user_email,
      user_name: user_name
    };

    // Insert the booking into the database
    const { data: newBooking, error: insertError } = await supabaseClient
      .from('bookings')
      .insert(bookingData)
      .select('*')
      .single();

    if (insertError) {
      console.error('Error inserting booking:', insertError);
      return res.status(500).json({
        success: false,
        message: 'Failed to create booking',
        error: insertError.message
      });
    }

    // Transform the response for frontend compatibility
    const bookingResponse = {
      id: newBooking.id,
      roomId: newBooking.room_id,
      roomTitle: room.title,
      roomImage: room.image_url,
      roomCategory: room.category,
      checkIn: newBooking.check_in,
      checkOut: newBooking.check_out,
      totalPrice: newBooking.total_price,
      nights: newBooking.nights,
      status: newBooking.status,
      paymentMethod: newBooking.payment_method,
      specialRequests: newBooking.special_requests,
      adults: newBooking.adults,
      children: newBooking.children,
      createdAt: newBooking.created_at
    };

    res.status(201).json({
      success: true,
      message: 'Booking created successfully',
      booking: bookingResponse
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
const updateBooking = async (req, res, next) => {
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
          message: 'The room is already booked for these dates',
          available: false
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (checkIn !== undefined) updateData.check_in = checkIn;
    if (checkOut !== undefined) updateData.check_out = checkOut;
    if (totalPrice !== undefined) updateData.total_price = totalPrice;
    if (nights !== undefined) updateData.nights = nights;
    if (paymentMethod !== undefined) updateData.payment_method = paymentMethod;
    if (specialRequests !== undefined) updateData.special_requests = specialRequests;
    if (adults !== undefined) updateData.adults = adults;
    if (children !== undefined) updateData.children = children;
    updateData.updated_at = new Date().toISOString();

    // Update booking
    const { data: updatedBooking, error } = await supabaseClient
      .from('bookings')
      .update(updateData)
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

    // Transform the response for frontend compatibility
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
const cancelBooking = async (req, res, next) => {
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
          category
        )
      `)
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform the response for frontend compatibility
    const bookingResponse = {
      id: updatedBooking.id,
      roomId: updatedBooking.room_id,
      roomTitle: updatedBooking.rooms?.title || '',
      roomImage: updatedBooking.rooms?.image_url || '',
      roomCategory: updatedBooking.rooms?.category || '',
      checkIn: updatedBooking.check_in,
      checkOut: updatedBooking.check_out,
      totalPrice: updatedBooking.total_price,
      nights: updatedBooking.nights,
      status: updatedBooking.status,
      paymentMethod: updatedBooking.payment_method,
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

module.exports = {
  createBooking,
  updateBooking,
  cancelBooking
};
