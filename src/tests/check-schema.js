/**
 * Check Database Schema
 * Retrieves and displays the structure of the rooms table
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

async function checkRoomsSchema() {
  try {
    console.log('Checking rooms table schema...');
    
    // Get sample rooms to see the structure
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .limit(1);
    
    if (error) {
      console.error('Error fetching rooms:', error.message);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('No rooms found in the database');
      return;
    }
    
    const room = rooms[0];
    
    console.log('Room table structure:');
    console.log(JSON.stringify(room, null, 2));
    
    // List all columns
    console.log('\nRoom table columns:');
    Object.keys(room).forEach(column => {
      console.log(`- ${column}: ${typeof room[column]}`);
    });
    
  } catch (error) {
    console.error('Error checking schema:', error.message);
  }
}

// Run the check
checkRoomsSchema();
