const express = require('express');
const router = express.Router();
const { supabaseClient } = require('../config/supabase');

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

module.exports = router;
