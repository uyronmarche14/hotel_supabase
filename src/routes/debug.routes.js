const express = require('express');
const router = express.Router();
const { supabaseClient } = require('../config/supabase');
const { verifyToken, isAdmin } = require('../middleware/auth.middleware');

// Add a debug endpoint to check room images
router.get('/room/:id/images', async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Debug: Checking room images for ID:', id);
    
    // Get room data
    const { data: room, error } = await supabaseClient
      .from('rooms')
      .select('id, title, image_url, images')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Debug: Error retrieving room:', error);
      return res.status(404).json({
        success: false, 
        message: 'Room not found',
        error: error.message
      });
    }
    
    console.log('Debug: Room image data:', {
      id: room.id,
      title: room.title,
      hasMainImage: !!room.image_url,
      mainImage: room.image_url ? room.image_url.substring(0, 50) + '...' : 'null',
      imagesCount: Array.isArray(room.images) ? room.images.length : 'not an array'
    });
    
    return res.json({
      success: true,
      room: {
        id: room.id,
        title: room.title,
        image_url: room.image_url,
        images: room.images
      }
    });
  } catch (err) {
    console.error('Debug: Unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred',
      error: err.message
    });
  }
});

// Debug endpoint to list all tables and count rows
router.get('/tables', async (req, res) => {
  try {
    // Query to get a list of all tables
    const { data: tables, error } = await supabaseClient
      .from('pg_tables')
      .select('schemaname, tablename')
      .eq('schemaname', 'public');
      
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching tables',
        error: error.message
      });
    }
    
    // Get row counts for each table
    const tableStats = [];
    
    for (const table of tables) {
      const { count, error: countError } = await supabaseClient
        .from(table.tablename)
        .select('*', { count: 'exact', head: true });
        
      tableStats.push({
        table: table.tablename,
        count: countError ? 'Error' : count,
        error: countError ? countError.message : null
      });
    }
    
    return res.json({
      success: true,
      tables: tableStats
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Unexpected error checking tables',
      error: err.message
    });
  }
});

// Debug endpoint to check booking data
router.get('/bookings/sample', async (req, res) => {
  try {
    // Get a few sample bookings
    const { data: bookings, error } = await supabaseClient
      .from('bookings')
      .select('*')
      .limit(5);
      
    if (error) {
      return res.status(500).json({
        success: false,
        message: 'Error fetching bookings',
        error: error.message
      });
    }
    
    // If no bookings, create a sample booking
    if (!bookings || bookings.length === 0) {
      // First check if we have any users and rooms
      const { data: users } = await supabaseClient
        .from('users')
        .select('id')
        .limit(1);
        
      const { data: rooms } = await supabaseClient
        .from('rooms')
        .select('id, title, category, price, image_url')
        .limit(1);
      
      if (users?.length > 0 && rooms?.length > 0) {
        // Create a sample booking
        const userId = users[0].id;
        const room = rooms[0];
        
        const sampleBooking = {
          user_id: userId,
          room_id: room.id,
          booking_id: `BK-${Date.now().toString().slice(-6)}`,
          first_name: 'Test',
          last_name: 'User',
          email: 'test@example.com',
          phone: '123-456-7890',
          room_type: room.type || 'standard',
          room_title: room.title,
          room_category: room.category,
          room_image: room.image_url,
          check_in: new Date().toISOString().split('T')[0], // Today
          check_out: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days later
          nights: 3,
          guests: 2,
          base_price: room.price || 100,
          tax_and_fees: (room.price || 100) * 0.15,
          total_price: (room.price || 100) * 1.15 * 3,
          status: 'confirmed',
          payment_status: 'paid',
          location: 'Taguig, Metro Manila',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        const { data: newBooking, error: createError } = await supabaseClient
          .from('bookings')
          .insert([sampleBooking])
          .select();
          
        if (createError) {
          return res.status(200).json({
            success: false,
            message: 'No bookings found and failed to create sample',
            error: createError.message,
            sampleData: sampleBooking
          });
        }
        
        return res.status(200).json({
          success: true,
          message: 'Created sample booking',
          bookings: newBooking
        });
      } else {
        return res.status(200).json({
          success: false,
          message: 'No bookings, users, or rooms found',
          usersFound: users?.length > 0,
          roomsFound: rooms?.length > 0
        });
      }
    }
    
    return res.json({
      success: true,
      count: bookings.length,
      bookings: bookings
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: 'Unexpected error checking bookings',
      error: err.message
    });
  }
});

// Debug admin bookings route
router.get('/admin/bookings', verifyToken, isAdmin, async (req, res) => {
  try {
    console.log('Debug admin bookings route accessed');
    
    // Check if the getAllBookings controller is working properly
    const { data: bookings, error } = await supabaseClient
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
      `)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Debug admin bookings error:', error);
      return res.status(500).json({
        success: false,
        message: 'Error fetching bookings',
        error: error.message
      });
    }
    
    // Transform the data the same way the admin controller does
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
      
      const room = booking.rooms || {};
      const user = booking.users || {};
      
      return {
        id: booking.id,
        booking_id: booking.booking_id || `BK-${Date.now().toString().slice(-6)}`,
        roomId: booking.room_id,
        roomTitle: room.title || 'Unknown Room',
        roomImage: room.image_url || '/images/room-placeholder.jpg',
        roomCategory: room.category || '',
        roomPrice: parseFloat(room.price) || 0,
        roomLocation: room.location || '',
        userId: booking.user_id,
        userName: user.name || booking.user_name || '',
        userEmail: user.email || booking.user_email || '',
        userProfilePic: user.profile_pic || '/images/default-user.png',
        checkIn: formatDate(booking.check_in),
        checkOut: formatDate(booking.check_out),
        totalPrice: parseFloat(booking.total_price) || 0,
        nights: booking.nights || 1,
        status: booking.status || 'pending',
        paymentMethod: booking.payment_method || 'credit_card',
        paymentStatus: booking.payment_status || 'pending',
        specialRequests: booking.special_requests || '',
        adults: parseInt(booking.adults) || 1,
        children: parseInt(booking.children) || 0,
        createdAt: booking.created_at,
        updatedAt: booking.updated_at || booking.created_at
      };
    });
    
    return res.status(200).json({
      success: true,
      count: bookings.length,
      bookings: bookingsResponse
    });
  } catch (err) {
    console.error('Debug admin bookings unexpected error:', err);
    return res.status(500).json({
      success: false,
      message: 'Unexpected error in debug admin bookings',
      error: err.message
    });
  }
});

module.exports = router;
