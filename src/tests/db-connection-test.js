/**
 * Database Connection Test
 * 
 * This script tests the database connection and basic functionality
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

/**
 * Test database connection and basic functionality
 */
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  console.log('-----------------------------------');
  
  try {
    // 1. Test basic connection
    console.log('1. Testing basic connection...');
    const startTime = Date.now();
    const { data, error } = await supabaseClient
      .from('users')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log(`✅ Basic connection successful (Response time: ${responseTime}ms)`);
    console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
    
    // 2. Test database tables
    console.log('\n2. Checking database tables...');
    
    // Check users table
    const { data: users, error: usersError } = await supabaseClient
      .from('users')
      .select('count')
      .limit(1);
    
    if (usersError) {
      console.log(`❌ Users table check failed: ${usersError.message}`);
    } else {
      console.log('✅ Users table accessible');
    }
    
    // Check rooms table
    const { data: rooms, error: roomsError } = await supabaseClient
      .from('rooms')
      .select('count')
      .limit(1);
    
    if (roomsError) {
      console.log(`❌ Rooms table check failed: ${roomsError.message}`);
    } else {
      console.log('✅ Rooms table accessible');
    }
    
    // Check bookings table
    const { data: bookings, error: bookingsError } = await supabaseClient
      .from('bookings')
      .select('count')
      .limit(1);
    
    if (bookingsError) {
      console.log(`❌ Bookings table check failed: ${bookingsError.message}`);
    } else {
      console.log('✅ Bookings table accessible');
    }
    
    // 3. Check database policies
    console.log('\n3. Checking database policies...');
    
    // Try to insert a test room without authentication
    const testRoom = {
      title: 'Test Room',
      description: 'A test room for testing policies',
      price: 100,
      category: 'standard-room', // Using a valid category from the schema
      location: 'Test Location'
    };
    
    const { data: insertedRoom, error: insertError } = await supabaseClient
      .from('rooms')
      .insert([testRoom])
      .select();
    
    if (insertError && insertError.message.includes('permission')) {
      console.log('✅ Room insert policy working correctly (requires authentication)');
    } else if (insertError) {
      console.log(`⚠️ Room insert failed but not due to permissions: ${insertError.message}`);
    } else {
      console.log('⚠️ Room insert succeeded without authentication - check policies');
    }
    
    // 4. Summary
    console.log('\n-----------------------------------');
    console.log('✅ Database connection test completed');
    console.log('   The database is connected and accessible');
    
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
  }
}

// Run the test
testDatabaseConnection();
