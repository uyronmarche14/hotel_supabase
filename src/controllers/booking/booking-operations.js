/**
 * Booking Operations Controller
 * Handles core booking operations: create, update, and cancel
 */

const { validationResult } = require('express-validator');
const { db } = require('../../db');
const { bookings, rooms } = require('../../db/schema');
const { eq, and, or, lte, gte, ne } = require('drizzle-orm');
const AppError = require('../../utils/appError');


// Helper to generate booking ID
const generateBookingId = () => {
  return `BK-${Date.now().toString().slice(-6)}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`;
};

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
    
    // Extract booking data from request body - support both snake_case and camelCase
    const {
      check_in, checkIn,
      check_out, checkOut,
      total_price, totalPrice,
      nights,
      adults,
      children,
      payment_method, paymentMethod,
      special_requests, specialRequests,
      user_email, email,
      user_name, firstName, lastName,
      phone
    } = req.body;
    
    // Resolve values
    const txCheckIn = check_in || checkIn;
    const txCheckOut = check_out || checkOut;
    const txTotalPrice = total_price || totalPrice;
    const txPaymentMethod = payment_method || paymentMethod;
    const txSpecialRequests = special_requests || specialRequests;
    const txEmail = user_email || email;
    
    // Extract room_id separately so we can modify it
    let roomId = req.body.room_id || req.body.roomId;
    
    console.log('Creating new booking with data:', JSON.stringify(req.body, null, 2));

    // Validate roomId format for UUID
    if (!roomId || roomId === 'undefined' || roomId === 'null') {
      console.error('Invalid room_id received:', roomId);
      
      // Get a fallback room to use instead
      const [fallbackRoom] = await db
        .select()
        .from(rooms)
        .limit(1);
      
      if (!fallbackRoom) {
        return res.status(400).json({
          success: false,
          message: 'Invalid room ID and no fallback rooms available',
          error: 'Please select a valid room'
        });
      }
      
      // Use the first available room as fallback
      roomId = fallbackRoom.id;
      console.log(`Using fallback room: ${roomId} (${fallbackRoom.title})`);
    }
    
    // Verify the room exists
    let room;
    try {
      const [roomData] = await db
        .select()
        .from(rooms)
        .where(eq(rooms.id, roomId));

      if (!roomData) {
        return res.status(404).json({
          success: false,
          message: 'Room not found',
          error: 'Room with the provided ID does not exist'
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
    const calculatedTotalPrice = txTotalPrice || (nights ? nights * roomPrice : roomPrice);
    
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
    
    // Prepare names
    // Prefer explicit firstName/lastName if provided, otherwise parse user_name
    let finalFirstName = '';
    let finalLastName = '';
    
    if (firstName && lastName) {
        finalFirstName = firstName;
        finalLastName = lastName;
    } else {
        const fullName = user_name || (firstName ? `${firstName}` : 'Guest User');
        const nameParts = fullName.split(' ');
        finalFirstName = nameParts[0];
        finalLastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : 'User';
    }

    // Create a properly formatted booking record with all required fields
    const bookingData = {
      bookingId: generateBookingId(),
      userId: userId,
      roomId: roomId,
      
      // Guest/User Info
      firstName: finalFirstName,
      lastName: finalLastName,
      email: txEmail || 'guest@example.com',
      phone: phone || 'N/A',
      
      // Room Info Snapshot
      roomType: room.type || 'standard',
      roomTitle: room.title,
      roomCategory: room.category,
      roomImage: room.imageUrl,
      
      // Booking Details
      checkIn: new Date(txCheckIn).toISOString().split('T')[0],
      checkOut: new Date(txCheckOut).toISOString().split('T')[0],
      nights: nights || 1,
      guests: (parseInt(adults) || 1) + (parseInt(children) || 0),
      adults: parseInt(adults) || 1,
      
      specialRequests: txSpecialRequests || '',
      basePrice: roomPrice.toString(),
      taxAndFees: '0', 
      totalPrice: calculatedTotalPrice.toString(),
      
      status: 'confirmed',
      paymentStatus: 'pending',
      location: room.location,
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Insert the booking into the database
    const [newBooking] = await db.insert(bookings).values(bookingData).returning();

    // Transform the response for frontend compatibility
    const bookingResponse = {
      id: newBooking.id,
      roomId: newBooking.roomId,
      roomTitle: newBooking.roomTitle,
      roomImage: newBooking.roomImage,
      roomCategory: newBooking.roomCategory,
      checkIn: newBooking.checkIn,
      checkOut: newBooking.checkOut,
      totalPrice: newBooking.totalPrice,
      nights: newBooking.nights,
      status: newBooking.status,
      // paymentMethod: newBooking.payment_method, // Not in Drizzle schema? Checking...
      // Schema has paymentStatus, but not paymentMethod. 
      // The original code had payment_method. Drizzle schema doesn't seem to have it.
      // We'll omit it from response or mock it.
      specialRequests: newBooking.specialRequests,
      createdAt: newBooking.createdAt
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
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));

    if (!existingBooking) {
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
      // Using Drizzle to check for overlap
      const [overlapBooking] = await db
        .select()
        .from(bookings)
        .where(
          and(
            eq(bookings.roomId, existingBooking.roomId),
            ne(bookings.id, id),
            or(
                and(lte(bookings.checkIn, checkOut), gte(bookings.checkOut, checkIn))
            ),
            ne(bookings.status, 'cancelled')
          )
        )
        .limit(1);

      if (overlapBooking) {
        return res.status(400).json({
          success: false,
          message: 'The room is already booked for these dates',
          available: false
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (checkIn !== undefined) updateData.checkIn = new Date(checkIn).toISOString().split('T')[0];
    if (checkOut !== undefined) updateData.checkOut = new Date(checkOut).toISOString().split('T')[0];
    if (totalPrice !== undefined) updateData.totalPrice = totalPrice.toString();
    if (nights !== undefined) updateData.nights = nights;
    // paymentMethod not in schema
    if (specialRequests !== undefined) updateData.specialRequests = specialRequests;
    // adults/children not separate columns in schema, guests is integer
    if (adults || children) {
       const totalGuests = (parseInt(adults) || 0) + (parseInt(children) || 0);
       if (totalGuests > 0) updateData.guests = totalGuests;
    }
    updateData.updatedAt = new Date();

    // Update booking
    const [updatedBooking] = await db
      .update(bookings)
      .set(updateData)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)))
      .returning();
    
    // Fetch room details for response
    const [bookedRoom] = await db.select().from(rooms).where(eq(rooms.id, updatedBooking.roomId));

    if (!updatedBooking) {
        return next(new AppError('Failed to update booking', 500));
    }

    // Transform the response for frontend compatibility
    // Transform the response for frontend compatibility
    const bookingResponse = {
      id: updatedBooking.id,
      roomId: updatedBooking.roomId,
      roomTitle: bookedRoom?.title || '',
      roomImage: bookedRoom?.imageUrl || '',
      roomCategory: bookedRoom?.category || '',
      roomPrice: bookedRoom?.price || 0,
      roomLocation: bookedRoom?.location || '',
      checkIn: updatedBooking.checkIn,
      checkOut: updatedBooking.checkOut,
      totalPrice: updatedBooking.totalPrice,
      nights: updatedBooking.nights,
      status: updatedBooking.status,
      // paymentMethod: updatedBooking.payment_method,
      specialRequests: updatedBooking.specialRequests,
      // adults: updatedBooking.adults,
      // children: updatedBooking.children,
      createdAt: updatedBooking.createdAt,
      updatedAt: updatedBooking.updatedAt
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
    const [existingBooking] = await db
      .select()
      .from(bookings)
      .where(and(eq(bookings.id, id), eq(bookings.userId, userId)));

    if (!existingBooking) {
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
    const [updatedBooking] = await db
      .update(bookings)
      .set({
        status: 'cancelled',
        updatedAt: new Date()
      })
      .where(eq(bookings.id, id))
      .returning();
      
    // Fetch room details for response
    const [bookedRoom] = await db.select().from(rooms).where(eq(rooms.id, updatedBooking.roomId));

    // Transform the response for frontend compatibility
    // Transform the response for frontend compatibility
    const bookingResponse = {
      id: updatedBooking.id,
      roomId: updatedBooking.roomId,
      roomTitle: bookedRoom?.title || '',
      roomImage: bookedRoom?.imageUrl || '',
      roomCategory: bookedRoom?.category || '',
      checkIn: updatedBooking.checkIn,
      checkOut: updatedBooking.checkOut,
      totalPrice: updatedBooking.totalPrice,
      nights: updatedBooking.nights,
      status: updatedBooking.status,
      // paymentMethod: updatedBooking.payment_method,
      createdAt: updatedBooking.createdAt,
      updatedAt: updatedBooking.updatedAt
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
