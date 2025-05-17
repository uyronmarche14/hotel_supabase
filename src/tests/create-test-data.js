/**
 * Create Test Data
 * Creates test data for the hotel application
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

// Simplified test room data with only essential fields
const testRoom = {
  title: 'Test Room',
  description: 'A test room for integration testing',
  price: 150,
  category: 'standard-room', // Using a valid category from the schema
  location: 'Test Location',
  capacity: 2, // Adding required fields
  type: 'standard'
};

/**
 * Create a test room
 */
async function createTestRoom() {
  try {
    console.log('Creating test room...');
    
    const { data, error } = await supabaseClient
      .from('rooms')
      .insert([testRoom])
      .select();
    
    if (error) {
      console.error('Error creating room:', error.message);
      return;
    }
    
    console.log('Test room created successfully:');
    console.log(data);
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run the function
createTestRoom();
