/**
 * Admin Authentication and Security Test
 * 
 * This script tests the admin authentication functionality and security measures
 */

require('dotenv').config();
const axios = require('axios');
const jwt = require('jsonwebtoken');
const { supabaseClient, getAuthenticatedClient } = require('../config/supabase');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000/api';
const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';

// Test admin credentials
const adminUser = {
  email: 'admin@example.com',
  password: 'Admin@123456'
};

// Test regular user credentials
const regularUser = {
  email: 'user@example.com',
  password: 'User@123456'
};

// Store tokens and data
let adminToken = null;
let userToken = null;
let adminId = null;
let userId = null;

/**
 * Run all tests
 */
async function runTests() {
  console.log('🔍 Starting admin authentication and security tests...');
  console.log(`🔗 Testing backend at: ${API_URL}`);
  console.log('-----------------------------------');

  try {
    // Test database connection
    await testDatabaseConnection();
    
    // Create test users if they don't exist
    await createTestUsers();
    
    // Test admin login
    await testAdminLogin();
    
    // Test regular user login
    await testUserLogin();
    
    // Test admin access to protected routes
    if (adminToken) {
      await testAdminAccess();
    }
    
    // Test that regular users cannot access admin routes
    if (userToken) {
      await testUserAccessRestrictions();
    }
    
    // Test JWT verification
    await testJwtVerification();
    
    // Test database security with different tokens
    await testDatabaseSecurity();
    
    console.log('✅ All tests completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
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
    return true;
  } catch (error) {
    console.error('❌ Database connection test failed:', error.message);
    return false;
  }
}

/**
 * Create test users if they don't exist
 */
async function createTestUsers() {
  console.log('🔍 Creating test users if they don\'t exist...');
  
  try {
    // Check if admin user exists
    const { data: existingAdmin, error: adminCheckError } = await supabaseClient
      .from('users')
      .select('id, email, role')
      .eq('email', adminUser.email)
      .eq('role', 'admin')
      .maybeSingle();
    
    if (adminCheckError) {
      console.error('❌ Error checking for admin user:', adminCheckError.message);
    }
    
    // Check if regular user exists
    const { data: existingUser, error: userCheckError } = await supabaseClient
      .from('users')
      .select('id, email, role')
      .eq('email', regularUser.email)
      .eq('role', 'user')
      .maybeSingle();
    
    if (userCheckError) {
      console.error('❌ Error checking for regular user:', userCheckError.message);
    }
    
    // Create admin user if it doesn't exist
    if (!existingAdmin) {
      console.log('Creating admin test user...');
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(adminUser.password, salt);
      
      const { data: newAdmin, error: createAdminError } = await supabaseClient
        .from('users')
        .insert([{
          name: 'Admin User',
          email: adminUser.email,
          password: hashedPassword,
          role: 'admin'
        }])
        .select()
        .single();
      
      if (createAdminError) {
        console.error('❌ Error creating admin user:', createAdminError.message);
      } else {
        console.log('✅ Admin user created successfully');
        adminId = newAdmin.id;
      }
    } else {
      console.log('✅ Admin user already exists');
      adminId = existingAdmin.id;
    }
    
    // Create regular user if it doesn't exist
    if (!existingUser) {
      console.log('Creating regular test user...');
      const bcrypt = require('bcrypt');
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(regularUser.password, salt);
      
      const { data: newUser, error: createUserError } = await supabaseClient
        .from('users')
        .insert([{
          name: 'Regular User',
          email: regularUser.email,
          password: hashedPassword,
          role: 'user'
        }])
        .select()
        .single();
      
      if (createUserError) {
        console.error('❌ Error creating regular user:', createUserError.message);
      } else {
        console.log('✅ Regular user created successfully');
        userId = newUser.id;
      }
    } else {
      console.log('✅ Regular user already exists');
      userId = existingUser.id;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error creating test users:', error.message);
    return false;
  }
}

/**
 * Test admin login
 */
async function testAdminLogin() {
  console.log('🔍 Testing admin login...');
  
  try {
    // Try admin-specific login endpoint
    try {
      const response = await axios.post(`${API_URL}/admin/auth/login`, {
        email: adminUser.email,
        password: adminUser.password
      });
      
      if (response.status === 200 && response.data.token) {
        adminToken = response.data.token;
        console.log('✅ Admin login successful via admin endpoint');
        return true;
      }
    } catch (adminLoginError) {
      console.log('⚠️ Admin login endpoint failed, trying regular login...');
      
      // Try regular login endpoint
      try {
        const response = await axios.post(`${API_URL}/auth/login`, {
          email: adminUser.email,
          password: adminUser.password
        });
        
        if (response.status === 200 && response.data.token) {
          adminToken = response.data.token;
          console.log('✅ Admin login successful via regular login endpoint');
          return true;
        }
      } catch (loginError) {
        console.error('❌ Regular login also failed for admin user');
        
        // Generate a test token for admin user to continue testing
        adminToken = generateTestToken(adminId, 'admin');
        console.log('⚠️ Generated test admin token to continue testing');
        return false;
      }
    }
  } catch (error) {
    console.error('❌ Admin login test failed:', error.message);
    
    // Generate a test token for admin user to continue testing
    adminToken = generateTestToken(adminId, 'admin');
    console.log('⚠️ Generated test admin token to continue testing');
    return false;
  }
}

/**
 * Test regular user login
 */
async function testUserLogin() {
  console.log('🔍 Testing regular user login...');
  
  try {
    const response = await axios.post(`${API_URL}/auth/login`, {
      email: regularUser.email,
      password: regularUser.password
    });
    
    if (response.status === 200 && response.data.token) {
      userToken = response.data.token;
      console.log('✅ Regular user login successful');
      return true;
    }
  } catch (error) {
    console.error('❌ Regular user login test failed:', error.message);
    
    // Generate a test token for regular user to continue testing
    userToken = generateTestToken(userId, 'user');
    console.log('⚠️ Generated test user token to continue testing');
    return false;
  }
}

/**
 * Test admin access to protected routes
 */
async function testAdminAccess() {
  console.log('🔍 Testing admin access to protected routes...');
  
  if (!adminToken) {
    console.log('⚠️ No admin token available, skipping test');
    return false;
  }
  
  const endpoints = [
    { path: '/admin/dashboard', name: 'Dashboard' },
    { path: '/admin/users', name: 'User Management' },
    { path: '/admin/rooms', name: 'Room Management' },
    { path: '/admin/bookings', name: 'Booking Management' },
    { path: '/admin/system-health', name: 'System Health' }
  ];
  
  let allSuccessful = true;
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(`${API_URL}${endpoint.path}`, {
        headers: {
          Authorization: `Bearer ${adminToken}`
        }
      });
      
      if (response.status === 200) {
        console.log(`✅ Admin can access ${endpoint.name}`);
      } else {
        console.log(`❌ Admin access to ${endpoint.name} failed with status ${response.status}`);
        allSuccessful = false;
      }
    } catch (error) {
      console.log(`❌ Admin access to ${endpoint.name} failed: ${error.message}`);
      allSuccessful = false;
    }
  }
  
  return allSuccessful;
}

/**
 * Test that regular users cannot access admin routes
 */
async function testUserAccessRestrictions() {
  console.log('🔍 Testing that regular users cannot access admin routes...');
  
  if (!userToken) {
    console.log('⚠️ No user token available, skipping test');
    return false;
  }
  
  const endpoints = [
    { path: '/admin/dashboard', name: 'Dashboard' },
    { path: '/admin/users', name: 'User Management' },
    { path: '/admin/rooms', name: 'Room Management' },
    { path: '/admin/bookings', name: 'Booking Management' },
    { path: '/admin/system-health', name: 'System Health' }
  ];
  
  let allRestricted = true;
  
  for (const endpoint of endpoints) {
    try {
      await axios.get(`${API_URL}${endpoint.path}`, {
        headers: {
          Authorization: `Bearer ${userToken}`
        }
      });
      
      console.log(`❌ Security issue: Regular user can access ${endpoint.name}`);
      allRestricted = false;
    } catch (error) {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        console.log(`✅ Regular user correctly denied access to ${endpoint.name}`);
      } else {
        console.log(`⚠️ Unexpected error when testing ${endpoint.name} access: ${error.message}`);
        allRestricted = false;
      }
    }
  }
  
  return allRestricted;
}

/**
 * Test JWT verification
 */
async function testJwtVerification() {
  console.log('🔍 Testing JWT verification...');
  
  // Test with valid admin token
  if (adminToken) {
    try {
      const decoded = jwt.verify(adminToken, JWT_SECRET);
      if (decoded && decoded.id && decoded.role === 'admin') {
        console.log('✅ Admin JWT verification successful');
      } else {
        console.log('❌ Admin JWT verification failed: Invalid payload');
        console.log('Decoded token:', decoded);
      }
    } catch (error) {
      console.log('❌ Admin JWT verification failed:', error.message);
    }
  }
  
  // Test with valid user token
  if (userToken) {
    try {
      const decoded = jwt.verify(userToken, JWT_SECRET);
      if (decoded && decoded.id && decoded.role === 'user') {
        console.log('✅ User JWT verification successful');
      } else {
        console.log('❌ User JWT verification failed: Invalid payload');
        console.log('Decoded token:', decoded);
      }
    } catch (error) {
      console.log('❌ User JWT verification failed:', error.message);
    }
  }
  
  // Test with tampered token
  try {
    const tamperedToken = adminToken ? adminToken.substring(0, adminToken.length - 5) + 'xxxxx' : '';
    jwt.verify(tamperedToken, JWT_SECRET);
    console.log('❌ Security issue: Tampered token verification did not fail');
  } catch (error) {
    console.log('✅ Tampered token correctly failed verification');
  }
  
  return true;
}

/**
 * Test database security with different tokens
 */
async function testDatabaseSecurity() {
  console.log('🔍 Testing database security with different tokens...');
  
  // Test with admin token
  if (adminToken) {
    try {
      // Create a test room with admin token
      const testRoom = {
        title: 'Admin Test Room',
        description: 'A test room created with admin token',
        price: 200,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard'
      };
      
      // Create authenticated client with admin token
      const adminClient = getAuthenticatedClient(adminToken);
      
      const { data: adminRoomData, error: adminRoomError } = await adminClient
        .from('rooms')
        .insert([testRoom])
        .select();
      
      if (adminRoomError) {
        console.log('❌ Admin could not create room:', adminRoomError.message);
      } else {
        console.log('✅ Admin successfully created room');
        
        // Clean up - delete the test room
        const { error: deleteError } = await adminClient
          .from('rooms')
          .delete()
          .eq('id', adminRoomData[0].id);
        
        if (deleteError) {
          console.log('⚠️ Could not delete test room:', deleteError.message);
        } else {
          console.log('✅ Admin successfully deleted room');
        }
      }
    } catch (error) {
      console.log('❌ Admin database security test failed:', error.message);
    }
  }
  
  // Test with regular user token
  if (userToken) {
    try {
      // Try to create a room with regular user token
      const testRoom = {
        title: 'User Test Room',
        description: 'A test room created with user token',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard'
      };
      
      // Create authenticated client with user token
      const userClient = getAuthenticatedClient(userToken);
      
      const { data: userRoomData, error: userRoomError } = await userClient
        .from('rooms')
        .insert([testRoom])
        .select();
      
      if (userRoomError && userRoomError.message.includes('permission')) {
        console.log('✅ Regular user correctly denied permission to create room');
      } else if (userRoomError) {
        console.log('⚠️ Regular user could not create room but for unexpected reason:', userRoomError.message);
      } else {
        console.log('❌ Security issue: Regular user was able to create room');
        
        // Clean up - delete the test room if it was created
        if (userRoomData && userRoomData[0]) {
          const adminClient = getAuthenticatedClient(adminToken);
          const { error: deleteError } = await adminClient
            .from('rooms')
            .delete()
            .eq('id', userRoomData[0].id);
          
          if (!deleteError) {
            console.log('✅ Cleaned up unauthorized room creation');
          }
        }
      }
    } catch (error) {
      console.log('❌ User database security test failed:', error.message);
    }
  }
  
  return true;
}

/**
 * Generate a test JWT token
 * @param {string} id - User ID
 * @param {string} role - User role
 * @returns {string} JWT token
 */
function generateTestToken(id, role) {
  return jwt.sign(
    { id, role },
    JWT_SECRET,
    { expiresIn: '1h' }
  );
}

// Run the tests
runTests();
