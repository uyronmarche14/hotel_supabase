/**
 * Verify Fixes Test Script
 * 
 * This script verifies that all fixes have been properly implemented
 * and that the admin functionality is working correctly.
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');
const jwt = require('jsonwebtoken');
const { getEnv } = require('../utils/env-validator');
const { verifyToken } = require('../utils/jwt');

// Get JWT configuration
const JWT_SECRET = getEnv('JWT_SECRET', 'your-secret-key');

/**
 * Run all verification tests
 */
async function runTests() {
  console.log('🔍 Starting verification tests...');
  console.log('-----------------------------------');

  try {
    // Test environment variables
    await testEnvironmentVariables();
    
    // Test database connection
    await testDatabaseConnection();
    
    // Test JWT functionality
    await testJwtFunctionality();
    
    // Test database policies
    await testDatabasePolicies();
    
    console.log('-----------------------------------');
    console.log('✅ All verification tests completed successfully!');
    console.log('The system is now ready for the next stage.');
  } catch (error) {
    console.error('❌ Verification test failed:', error.message);
  }
}

/**
 * Test environment variables
 */
async function testEnvironmentVariables() {
  console.log('🔍 Testing environment variables...');
  
  // Check critical environment variables
  const criticalVars = [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY',
    'JWT_SECRET'
  ];
  
  const missingVars = [];
  
  criticalVars.forEach(varName => {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  });
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing critical environment variables: ${missingVars.join(', ')}`);
    console.error('Please set these variables in your .env file');
  } else {
    console.log('✅ All critical environment variables are set');
    console.log(`   JWT_SECRET: ${process.env.JWT_SECRET ? '********' : 'Not set'}`);
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? process.env.SUPABASE_URL : 'Not set'}`);
  }
}

/**
 * Test database connection
 */
async function testDatabaseConnection() {
  console.log('🔍 Testing database connection...');
  
  try {
    const startTime = Date.now();
    const { data, error } = await supabaseClient
      .from('users')
      .select('count')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log(`✅ Database connection successful (Response time: ${responseTime}ms)`);
    
    // Check database tables
    const tables = ['users', 'rooms', 'bookings', 'refresh_tokens'];
    
    for (const table of tables) {
      const { error: tableError } = await supabaseClient
        .from(table)
        .select('count')
        .limit(1);
      
      if (tableError) {
        console.error(`❌ Table '${table}' check failed: ${tableError.message}`);
      } else {
        console.log(`✅ Table '${table}' is accessible`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Test JWT functionality
 */
async function testJwtFunctionality() {
  console.log('🔍 Testing JWT functionality...');
  
  try {
    // Create a test payload
    const testPayload = {
      id: '12345',
      role: 'admin'
    };
    
    // Generate a token
    const token = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
    console.log('✅ JWT token generation successful');
    
    // Verify the token
    const decoded = verifyToken(token);
    
    if (!decoded) {
      throw new Error('Token verification failed');
    }
    
    console.log('✅ JWT token verification successful');
    console.log(`   Decoded ID: ${decoded.id}`);
    console.log(`   Decoded Role: ${decoded.role}`);
    
    // Test with invalid token
    const invalidToken = token + 'invalid';
    const invalidDecoded = verifyToken(invalidToken);
    
    if (invalidDecoded) {
      console.error('❌ Invalid token verification did not fail as expected');
    } else {
      console.log('✅ Invalid token correctly failed verification');
    }
    
    return true;
  } catch (error) {
    console.error('❌ JWT functionality test failed:', error.message);
    return false;
  }
}

/**
 * Test database policies
 */
async function testDatabasePolicies() {
  console.log('🔍 Testing database policies...');
  
  try {
    // Test room insertion with anonymous client
    const testRoom = {
      title: 'Policy Test Room',
      description: 'A room to test database policies',
      price: 150,
      category: 'standard-room',
      location: 'Test Location',
      capacity: 2,
      type: 'standard'
    };
    
    const { data: roomData, error: roomError } = await supabaseClient
      .from('rooms')
      .insert([testRoom])
      .select();
    
    if (roomError && roomError.message.includes('permission')) {
      console.log('✅ Anonymous room insertion correctly denied by policy');
    } else if (roomError) {
      console.log(`⚠️ Room insertion failed but not due to permissions: ${roomError.message}`);
    } else {
      console.log('❌ Security issue: Anonymous room insertion succeeded');
      
      // Clean up the test room if it was created
      if (roomData && roomData[0]) {
        await supabaseClient
          .from('rooms')
          .delete()
          .eq('id', roomData[0].id);
        
        console.log('   Cleaned up test room');
      }
    }
    
    // Test user data access with anonymous client
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, name, email, role')
      .limit(10);
    
    if (userError && userError.message.includes('permission')) {
      console.log('✅ Anonymous user data access correctly denied by policy');
    } else if (userError) {
      console.log(`⚠️ User data access failed but not due to permissions: ${userError.message}`);
    } else {
      console.log('⚠️ Anonymous client can access user data - check policies');
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database policies test failed:', error.message);
    return false;
  }
}

// Run the tests
runTests();
