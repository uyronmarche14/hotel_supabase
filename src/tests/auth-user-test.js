/**
 * Authentication and User Management Test Script
 * 
 * This script tests the authentication and user management functionality
 * by making direct API calls to the backend.
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000/api';

// Test user credentials
const testUser = {
  name: 'Test User',
  email: `test${Date.now()}@example.com`,
  password: 'password123'
};

// Store tokens and user data
let authToken = null;
let userId = null;

/**
 * Run all tests
 */
async function runTests() {
  console.log('🔍 Starting authentication and user management tests...');
  console.log(`🔗 Testing backend at: ${API_URL}`);
  console.log('-----------------------------------');

  try {
    // Test registration
    await testRegistration();
    
    // Test login
    await testLogin();
    
    // Test get user profile
    await testGetUserProfile();
    
    // Test update user profile
    await testUpdateUserProfile();
    
    // Test change password
    await testChangePassword();
    
    // Test logout
    await testLogout();
    
    console.log('✅ All tests passed! Authentication and user management are properly connected and functioning.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', JSON.stringify(error.response.data, null, 2));
    }
    process.exit(1);
  }
}

/**
 * Test user registration
 */
async function testRegistration() {
  console.log('🔍 Testing user registration...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    
    // Validate response format
    if (response.status !== 201 || !response.data.success) {
      throw new Error('Registration failed');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Registration response missing user data');
    }
    
    userId = response.data.user.id;
    console.log('✅ Registration successful');
    console.log(`   User ID: ${userId}`);
    console.log(`   Email: ${testUser.email}`);
  } catch (error) {
    console.error('❌ Registration test failed');
    throw error;
  }
}

/**
 * Test user login
 */
async function testLogin() {
  console.log('🔍 Testing user login...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    }, {
      withCredentials: true
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Login failed');
    }
    
    // Validate token in response
    if (!response.data.token) {
      throw new Error('Login response missing token');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Login response missing user data');
    }
    
    // Store token for subsequent tests
    authToken = response.data.token;
    
    console.log('✅ Login successful');
    console.log(`   Token received: ${authToken.substring(0, 15)}...`);
  } catch (error) {
    console.error('❌ Login test failed');
    throw error;
  }
}

/**
 * Test get user profile
 */
async function testGetUserProfile() {
  console.log('🔍 Testing get user profile...');
  
  if (!authToken) {
    throw new Error('No auth token available for profile test');
  }
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Get profile failed');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Profile response missing user data');
    }
    
    console.log('✅ Get profile successful');
    console.log(`   User name: ${response.data.user.name}`);
    console.log(`   User email: ${response.data.user.email}`);
  } catch (error) {
    console.error('❌ Get profile test failed');
    throw error;
  }
}

/**
 * Test update user profile
 */
async function testUpdateUserProfile() {
  console.log('🔍 Testing update user profile...');
  
  if (!authToken) {
    throw new Error('No auth token available for profile update test');
  }
  
  const updatedName = `Updated Name ${Date.now()}`;
  
  try {
    const response = await axios.put(`${API_URL}/auth/update-profile`, {
      name: updatedName
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Update profile failed');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Update profile response missing user data');
    }
    
    // Validate updated name
    if (response.data.user.name !== updatedName) {
      throw new Error('Profile name was not updated correctly');
    }
    
    console.log('✅ Update profile successful');
    console.log(`   Updated name: ${response.data.user.name}`);
  } catch (error) {
    console.error('❌ Update profile test failed');
    throw error;
  }
}

/**
 * Test change password
 */
async function testChangePassword() {
  console.log('🔍 Testing change password...');
  
  if (!authToken) {
    throw new Error('No auth token available for password change test');
  }
  
  const newPassword = `newpassword${Date.now()}`;
  
  try {
    const response = await axios.put(`${API_URL}/auth/change-password`, {
      currentPassword: testUser.password,
      newPassword: newPassword,
      confirmPassword: newPassword
    }, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Change password failed');
    }
    
    // Update stored password for logout test
    testUser.password = newPassword;
    
    console.log('✅ Change password successful');
  } catch (error) {
    console.error('❌ Change password test failed');
    throw error;
  }
}

/**
 * Test logout
 */
async function testLogout() {
  console.log('🔍 Testing logout...');
  
  if (!authToken) {
    throw new Error('No auth token available for logout test');
  }
  
  try {
    const response = await axios.post(`${API_URL}/auth/logout`, {}, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      withCredentials: true
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Logout failed');
    }
    
    console.log('✅ Logout successful');
  } catch (error) {
    console.error('❌ Logout test failed');
    throw error;
  }
}

// Run the tests
runTests();
