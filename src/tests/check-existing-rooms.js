/**
 * Check Existing Rooms
 * Examines existing rooms in the database to understand the schema
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

async function checkExistingRooms() {
  try {
    console.log('Checking for existing rooms in the database...');
    
    // Try to get all rooms
    const { data: rooms, error } = await supabaseClient
      .from('rooms')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Error fetching rooms:', error.message);
      return;
    }
    
    if (!rooms || rooms.length === 0) {
      console.log('No rooms found in the database');
      
      // Let's check what tables exist
      console.log('\nChecking available tables...');
      const { data: tables, error: tablesError } = await supabaseClient
        .rpc('list_tables');
      
      if (tablesError) {
        console.error('Error listing tables:', tablesError.message);
      } else {
        console.log('Available tables:', tables);
      }
      
      return;
    }
    
    console.log(`Found ${rooms.length} rooms in the database`);
    
    // Show the first room as an example
    console.log('\nSample room structure:');
    console.log(JSON.stringify(rooms[0], null, 2));
    
    // Extract unique categories
    const categories = [...new Set(rooms.map(room => room.category))];
    console.log('\nAvailable categories:', categories);
    
    // Show all column names and their types
    if (rooms.length > 0) {
      console.log('\nRoom table columns:');
      Object.entries(rooms[0]).forEach(([key, value]) => {
        console.log(`- ${key}: ${typeof value} (Example: ${JSON.stringify(value)})`);
      });
    }
    
  } catch (error) {
    console.error('Error checking existing rooms:', error.message);
  }
}

// Run the check
checkExistingRooms();
