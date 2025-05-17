/**
 * Authentication and User Management Verification Script
 * 
 * This script directly tests the core functionality of the authentication and user management systems
 * without relying on the full server infrastructure.
 */

const { supabaseClient } = require('../config/supabase');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateToken, verifyToken } = require('../utils/jwt');

// Test user data
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123'
};

/**
 * Run verification tests
 */
async function verifyAuthAndUserSystems() {
  console.log('🔍 Starting authentication and user management verification...');
  console.log('-----------------------------------');

  try {
    // Test Supabase connection
    await testSupabaseConnection();
    
    // Test user creation
    const userId = await testUserCreation();
    
    // Test JWT token generation and verification
    await testJwtFunctionality(userId);
    
    // Test user profile management
    await testUserProfileManagement(userId);
    
    // Clean up test user
    await cleanupTestUser(userId);
    
    console.log('✅ All verification tests passed!');
    console.log('✅ Authentication and user management systems are properly connected and functioning.');
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

/**
 * Test Supabase connection
 */
async function testSupabaseConnection() {
  console.log('🔍 Testing Supabase connection...');
  
  try {
    // Check if we can connect to Supabase
    const { data, error } = await supabaseClient.from('users').select('count').limit(1);
    
    if (error) {
      throw new Error(`Supabase connection error: ${error.message}`);
    }
    
    console.log('✅ Supabase connection successful');
  } catch (error) {
    console.error('❌ Supabase connection test failed');
    throw error;
  }
}

/**
 * Test user creation
 */
async function testUserCreation() {
  console.log('🔍 Testing user creation...');
  
  try {
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(testUser.password, salt);
    
    // Create a test user
    const { data: newUser, error } = await supabaseClient
      .from('users')
      .insert({
        name: testUser.name,
        email: testUser.email,
        password: hashedPassword,
        role: 'user',
        created_at: new Date().toISOString()
      })
      .select('id')
      .single();
    
    if (error) {
      throw new Error(`User creation error: ${error.message}`);
    }
    
    if (!newUser || !newUser.id) {
      throw new Error('User creation failed: No user ID returned');
    }
    
    console.log('✅ User creation successful');
    console.log(`   User ID: ${newUser.id}`);
    
    return newUser.id;
  } catch (error) {
    console.error('❌ User creation test failed');
    throw error;
  }
}

/**
 * Test JWT token generation and verification
 */
async function testJwtFunctionality(userId) {
  console.log('🔍 Testing JWT functionality...');
  
  try {
    // Generate a token
    const token = generateToken({ id: userId });
    
    if (!token) {
      throw new Error('Token generation failed');
    }
    
    // Verify the token
    const decoded = verifyToken(token);
    
    if (!decoded || decoded.id !== userId) {
      throw new Error('Token verification failed');
    }
    
    console.log('✅ JWT functionality working correctly');
  } catch (error) {
    console.error('❌ JWT functionality test failed');
    throw error;
  }
}

/**
 * Test user profile management
 */
async function testUserProfileManagement(userId) {
  console.log('🔍 Testing user profile management...');
  
  try {
    // Get user profile
    const { data: user, error: getUserError } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic, created_at')
      .eq('id', userId)
      .single();
    
    if (getUserError || !user) {
      throw new Error(`Get user profile error: ${getUserError?.message || 'User not found'}`);
    }
    
    // Update user profile
    const updatedName = `Updated Name ${Date.now()}`;
    
    const { data: updatedUser, error: updateError } = await supabaseClient
      .from('users')
      .update({
        name: updatedName,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name')
      .single();
    
    if (updateError || !updatedUser) {
      throw new Error(`Update user profile error: ${updateError?.message || 'Update failed'}`);
    }
    
    if (updatedUser.name !== updatedName) {
      throw new Error('Update user profile failed: Name was not updated correctly');
    }
    
    console.log('✅ User profile management working correctly');
  } catch (error) {
    console.error('❌ User profile management test failed');
    throw error;
  }
}

/**
 * Clean up test user
 */
async function cleanupTestUser(userId) {
  console.log('🔍 Cleaning up test user...');
  
  try {
    const { error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', userId);
    
    if (error) {
      throw new Error(`Cleanup error: ${error.message}`);
    }
    
    console.log('✅ Test user cleaned up successfully');
  } catch (error) {
    console.error('❌ Test user cleanup failed');
    throw error;
  }
}

// Run the verification tests
verifyAuthAndUserSystems();
