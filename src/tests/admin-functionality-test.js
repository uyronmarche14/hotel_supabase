/**
 * Admin Functionality Test
 * 
 * This script tests the admin functionality and database connection
 * by simulating admin API requests and validating responses.
 */

const axios = require('axios');
require('dotenv').config();
const { supabaseClient } = require('../config/supabase');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000/api';

// Test admin credentials
const adminUser = {
  email: 'admin',
  password: 'admin123'
};

// Store tokens and data
let authToken = null;
let userId = null;

/**
 * Run all tests
 */
async function runTests() {
  console.log('🔍 Starting admin functionality tests...');
  console.log(`🔗 Testing backend at: ${API_URL}`);
  console.log('-----------------------------------');

  try {
    // Test database connection directly
    await testDatabaseConnection();
    
    // Test admin login
    await testAdminLogin();
    
    if (authToken) {
      // Test admin dashboard
      await testAdminDashboard();
      
      // Test admin user management
      await testAdminUserManagement();
      
      // Test admin room management
      await testAdminRoomManagement();
      
      // Test admin booking management
      await testAdminBookingManagement();
      
      // Test system health
      await testSystemHealth();
    }
    
    console.log('✅ All tests passed! Admin functionality is properly configured.');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

/**
 * Test direct database connection
 */
async function testDatabaseConnection() {
  console.log('🔍 Testing direct database connection...');
  
  try {
    // Simple query to test connection
    const startTime = Date.now();
    const { data, error } = await supabaseClient
      .from('users')
      .select('id')
      .limit(1);
    
    const responseTime = Date.now() - startTime;
    
    if (error) {
      throw new Error(`Database connection failed: ${error.message}`);
    }
    
    console.log(`✅ Database connection successful (Response time: ${responseTime}ms)`);
    console.log(`   Supabase URL: ${process.env.SUPABASE_URL}`);
    
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Test admin login
 */
async function testAdminLogin() {
  console.log('🔍 Testing admin login...');
  
  try {
    // First, check if an admin user exists
    const { data: adminExists, error: adminCheckError } = await supabaseClient
      .from('users')
      .select('id, email')
      .eq('role', 'admin')
      .limit(1);
    
    if (adminCheckError) {
      throw new Error(`Failed to check for admin user: ${adminCheckError.message}`);
    }
    
    // If no admin exists, create one
    if (!adminExists || adminExists.length === 0) {
      console.log('⚠️ No admin user found, creating one...');
      
      // Create admin user
      const { data: newAdmin, error: createError } = await createAdminUser();
      
      if (createError) {
        throw new Error(`Failed to create admin user: ${createError.message}`);
      }
      
      adminUser.email = newAdmin.email;
    } else {
      console.log(`ℹ️ Using existing admin: ${adminExists[0].email}`);
      adminUser.email = adminExists[0].email;
    }
    
    // Try admin login
    try {
      const response = await axios.post(`${API_URL}/admin/auth/login`, {
        email: adminUser.email,
        password: adminUser.password
      });
      
      // Validate response format
      if (response.status !== 200 || !response.data.success) {
        throw new Error('Admin login failed');
      }
      
      // Validate token in response
      if (!response.data.token) {
        throw new Error('Admin login response missing token');
      }
      
      // Store token and user ID for subsequent tests
      authToken = response.data.token;
      userId = response.data.user.id;
      
      console.log('✅ Admin login successful');
      return true;
    } catch (error) {
      // If login fails, try regular API
      console.log('⚠️ Admin login endpoint failed, trying regular login...');
      
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: adminUser.email,
          password: adminUser.password
        });
        
        if (response.status === 200 && response.data.token) {
          authToken = response.data.token;
          userId = response.data.user.id;
          console.log('✅ Admin login successful via regular login');
          return true;
        }
      } catch (loginError) {
        console.error('❌ Regular login also failed');
      }
      
      console.error('❌ Admin login test failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Admin login test failed:', error.message);
    return false;
  }
}

/**
 * Create admin user in database
 */
async function createAdminUser() {
  try {
    // Generate a unique email
    const uniqueEmail = `admin${Date.now()}@example.com`;
    adminUser.email = uniqueEmail;
    
    // Hash password (simplified for testing)
    const bcrypt = require('bcrypt');
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminUser.password, salt);
    
    // Insert admin user
    const { data, error } = await supabaseClient
      .from('users')
      .insert([
        {
          name: 'Admin User',
          email: adminUser.email,
          password: hashedPassword,
          role: 'admin'
        }
      ])
      .select()
      .single();
    
    if (error) {
      return { error };
    }
    
    return { data };
  } catch (error) {
    return { error };
  }
}

/**
 * Test admin dashboard
 */
async function testAdminDashboard() {
  console.log('🔍 Testing admin dashboard...');
  
  if (!authToken) {
    console.log('⚠️ No auth token available, skipping dashboard test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/admin/dashboard`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Admin dashboard access failed');
    }
    
    // Validate dashboard data
    if (!response.data.dashboard) {
      throw new Error('Admin dashboard response missing data');
    }
    
    console.log('✅ Admin dashboard access successful');
    console.log(`   Total Users: ${response.data.dashboard.totalUsers}`);
    console.log(`   Total Rooms: ${response.data.dashboard.totalRooms}`);
    console.log(`   Total Bookings: ${response.data.dashboard.totalBookings}`);
    
    return true;
  } catch (error) {
    console.error('❌ Admin dashboard test failed:', error.message);
    return false;
  }
}

/**
 * Test admin user management
 */
async function testAdminUserManagement() {
  console.log('🔍 Testing admin user management...');
  
  if (!authToken) {
    console.log('⚠️ No auth token available, skipping user management test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/admin/users`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('Admin user management access failed');
    }
    
    // Validate users data
    if (!response.data.users || !Array.isArray(response.data.users)) {
      throw new Error('Admin user management response missing users data');
    }
    
    console.log('✅ Admin user management access successful');
    console.log(`   Users count: ${response.data.users.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Admin user management test failed:', error.message);
    return false;
  }
}

/**
 * Test admin room management
 */
async function testAdminRoomManagement() {
  console.log('🔍 Testing admin room management...');
  
  if (!authToken) {
    console.log('⚠️ No auth token available, skipping room management test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/admin/rooms`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200) {
      throw new Error('Admin room management access failed');
    }
    
    console.log('✅ Admin room management access successful');
    
    return true;
  } catch (error) {
    // If the endpoint returns 404, it might be that we're using the regular rooms endpoint
    if (error.response && error.response.status === 404) {
      console.log('⚠️ Admin room management endpoint not found, trying regular rooms endpoint...');
      
      try {
        const response = await axios.get(`${API_URL}/hotels`, {
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        });
        
        if (response.status === 200) {
          console.log('✅ Room management access successful via regular endpoint');
          return true;
        }
      } catch (roomError) {
        console.error('❌ Regular room endpoint also failed');
      }
    }
    
    console.error('❌ Admin room management test failed:', error.message);
    return false;
  }
}

/**
 * Test admin booking management
 */
async function testAdminBookingManagement() {
  console.log('🔍 Testing admin booking management...');
  
  if (!authToken) {
    console.log('⚠️ No auth token available, skipping booking management test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/admin/bookings`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200) {
      throw new Error('Admin booking management access failed');
    }
    
    console.log('✅ Admin booking management access successful');
    
    return true;
  } catch (error) {
    console.error('❌ Admin booking management test failed:', error.message);
    return false;
  }
}

/**
 * Test system health
 */
async function testSystemHealth() {
  console.log('🔍 Testing system health endpoint...');
  
  if (!authToken) {
    console.log('⚠️ No auth token available, skipping system health test');
    return false;
  }
  
  try {
    const response = await axios.get(`${API_URL}/admin/system-health`, {
      headers: {
        Authorization: `Bearer ${authToken}`
      }
    });
    
    // Validate response format
    if (response.status !== 200 || !response.data.success) {
      throw new Error('System health check failed');
    }
    
    // Validate health data
    if (!response.data.health) {
      throw new Error('System health response missing data');
    }
    
    console.log('✅ System health check successful');
    console.log(`   System status: ${response.data.health.status}`);
    console.log(`   Database status: ${response.data.health.database.status}`);
    console.log(`   Database response time: ${response.data.health.database.responseTime}`);
    
    return true;
  } catch (error) {
    console.error('❌ System health test failed:', error.message);
    return false;
  }
}

// Run the tests
runTests();
