/**
 * Connection Test Script
 * 
 * This script tests the connection between the frontend and backend
 * by simulating common API requests and validating responses.
 */

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000/api';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Test user credentials
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  password: 'password123'
};

// Store tokens and user data
let authToken = null;
let refreshToken = null;
let userId = null;

/**
 * Run all tests
 */
async function runTests() {
  console.log('🔍 Starting connection tests...');
  console.log(`🔗 Testing backend at: ${API_URL}`);
  console.log(`🔗 Frontend URL: ${FRONTEND_URL}`);
  console.log('-----------------------------------');

  try {
    // Test server health
    await testServerHealth();
    
    // Test registration
    await testRegistration();
    
    // Test login
    await testLogin();
    
    // Test protected route
    await testProtectedRoute();
    
    // Test refresh token
    await testRefreshToken();
    
    // Test logout
    await testLogout();
    
    console.log('✅ All tests passed! Backend is properly configured for frontend connection.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

/**
 * Test server health
 */
async function testServerHealth() {
  console.log('🔍 Testing server health...');
  
  try {
    const response = await axios.get(`${API_URL}/health`);
    
    if (response.status !== 200 || !response.data.status === 'ok') {
      throw new Error('Server health check failed');
    }
    
    console.log('✅ Server is healthy');
  } catch (error) {
    console.error('❌ Server health check failed:', error.message);
    throw new Error('Server health check failed');
  }
}

/**
 * Test user registration
 */
async function testRegistration() {
  console.log('🔍 Testing user registration...');
  
  try {
    // Generate a unique email to avoid conflicts
    const uniqueEmail = `test${Date.now()}@example.com`;
    testUser.email = uniqueEmail;
    
    const response = await axios.post(`${API_URL}/auth/register`, testUser);
    
    // Validate response format
    if (response.status !== 201 || !response.data.success) {
      throw new Error('Registration failed');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Registration response missing user data');
    }
    
    console.log('✅ Registration successful');
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
    
    // Store token and user ID for subsequent tests
    authToken = response.data.token;
    userId = response.data.user.id;
    
    // Get refresh token from cookies
    if (response.headers['set-cookie']) {
      const cookies = response.headers['set-cookie'];
      const refreshTokenCookie = cookies.find(cookie => cookie.startsWith('refreshToken='));
      if (refreshTokenCookie) {
        refreshToken = refreshTokenCookie.split(';')[0].split('=')[1];
      }
    }
    
    console.log('✅ Login successful');
  } catch (error) {
    console.error('❌ Login test failed');
    throw error;
  }
}

/**
 * Test protected route
 */
async function testProtectedRoute() {
  console.log('🔍 Testing protected route access...');
  
  if (!authToken) {
    throw new Error('No auth token available for protected route test');
  }
  
  try {
    const response = await axios.get(`${API_URL}/auth/me`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      },
      withCredentials: true
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Protected route access failed');
    }
    
    // Validate user data in response
    if (!response.data.user || !response.data.user.id) {
      throw new Error('Protected route response missing user data');
    }
    
    console.log('✅ Protected route access successful');
  } catch (error) {
    console.error('❌ Protected route test failed');
    throw error;
  }
}

/**
 * Test refresh token
 */
async function testRefreshToken() {
  console.log('🔍 Testing token refresh...');
  
  if (!refreshToken) {
    console.log('⚠️ No refresh token available, skipping refresh token test');
    return;
  }
  
  try {
    const response = await axios.post(`${API_URL}/auth/refresh-token`, {
      refreshToken
    }, {
      withCredentials: true
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Token refresh failed');
    }
    
    // Validate token in response
    if (!response.data.token) {
      throw new Error('Token refresh response missing token');
    }
    
    // Update token for subsequent tests
    authToken = response.data.token;
    
    console.log('✅ Token refresh successful');
  } catch (error) {
    console.error('❌ Token refresh test failed');
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
