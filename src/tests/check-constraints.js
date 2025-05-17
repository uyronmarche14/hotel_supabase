/**
 * Check Database Constraints
 * Retrieves information about constraints on the rooms table
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

async function checkRoomsConstraints() {
  try {
    console.log('Checking rooms table constraints...');
    
    // First, let's try to get the table definition
    const { data, error } = await supabaseClient
      .rpc('get_table_definition', { table_name: 'rooms' });
    
    if (error) {
      console.error('Error getting table definition:', error.message);
      
      // Alternative approach: try to insert with different categories to see which ones are valid
      console.log('\nTesting valid categories by insertion...');
      
      const categories = ['standard', 'deluxe', 'suite', 'executive', 'premium', 'luxury', 'family'];
      
      for (const category of categories) {
        const testRoom = {
          title: `Test ${category} Room`,
          description: 'A test room for checking constraints',
          price: 150,
          category: category,
          location: 'Test Location',
          image_url: 'https://example.com/test-room.jpg',
          is_available: true,
          amenities: ['wifi', 'tv']
        };
        
        const { data: roomData, error: roomError } = await supabaseClient
          .from('rooms')
          .insert([testRoom])
          .select();
        
        if (roomError) {
          console.log(`Category '${category}' is invalid: ${roomError.message}`);
        } else {
          console.log(`Category '${category}' is valid!`);
          
          // Clean up the test room
          if (roomData && roomData.length > 0) {
            await supabaseClient
              .from('rooms')
              .delete()
              .eq('id', roomData[0].id);
          }
        }
      }
      
      return;
    }
    
    console.log('Table definition:');
    console.log(data);
    
  } catch (error) {
    console.error('Error checking constraints:', error.message);
  }
}

// Run the check
checkRoomsConstraints();
