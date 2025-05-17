/**
 * Test Environment Setup
 * Creates necessary test data for running integration tests
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

// Test room data
const testRoom = {
  title: 'Test Deluxe Room',
  description: 'A test room for integration testing',
  price: 150,
  max_adults: 2,
  max_children: 2,
  category: 'deluxe',
  location: 'Test Location',
  image_url: 'https://example.com/test-room.jpg',
  is_available: true,
  amenities: ['wifi', 'tv', 'ac', 'breakfast'],
  size: '30 sqm',
  bed_type: 'king'
};

/**
 * Create a test room if none exists
 */
async function createTestRoom() {
  try {
    console.log('Checking for existing test rooms...');
    
    // Check if test room already exists
    const { data: existingRooms, error: checkError } = await supabaseClient
      .from('rooms')
      .select('id')
      .eq('title', testRoom.title)
      .limit(1);
    
    if (checkError) {
      console.error('Error checking for existing rooms:', checkError.message);
      return null;
    }
    
    if (existingRooms && existingRooms.length > 0) {
      console.log('Test room already exists:', existingRooms[0].id);
      return existingRooms[0].id;
    }
    
    // Create a new test room
    console.log('Creating test room...');
    const { data: newRoom, error } = await supabaseClient
      .from('rooms')
      .insert([testRoom])
      .select()
      .single();
    
    if (error) {
      console.error('Error creating test room:', error.message);
      return null;
    }
    
    console.log('Test room created successfully:', newRoom.id);
    return newRoom.id;
  } catch (error) {
    console.error('Error in createTestRoom:', error.message);
    return null;
  }
}

/**
 * Main function to set up test environment
 */
async function setupTestEnvironment() {
  try {
    console.log('Setting up test environment...');
    
    // Create test room
    const roomId = await createTestRoom();
    if (!roomId) {
      console.error('Failed to create or find test room');
      process.exit(1);
    }
    
    console.log('Test environment setup complete');
    console.log('Test room ID:', roomId);
    
  } catch (error) {
    console.error('Test environment setup failed:', error.message);
    process.exit(1);
  }
}

// Run setup
setupTestEnvironment();
