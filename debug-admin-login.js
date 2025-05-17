/**
 * Debug Admin Login Script
 * 
 * This script directly tests the admin login endpoint with proper request formatting
 */

require('dotenv').config();
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:10000/api';

// Test admin credentials confirmed to have matching password hash
const adminCredentials = {
  email: 'admin@example.com',
  password: 'Admin@123456'
};

async function testAdminLogin() {
  console.log(`🔍 Testing admin login at: ${API_URL}/auth/admin-login`);
  console.log(`📧 Using email: ${adminCredentials.email}`);
  console.log(`🔑 Using password: ${adminCredentials.password}`);
  
  try {
    // Make the request with proper headers and timeout
    const response = await axios.post(
      `${API_URL}/auth/admin-login`,
      adminCredentials,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000
      }
    );
    
    console.log(`✅ Status: ${response.status}`);
    console.log('✅ Response data:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    
    if (error.response) {
      console.error(`❌ Status: ${error.response.status}`);
      console.error('❌ Response data:', JSON.stringify(error.response.data, null, 2));
      
      // Add more error details
      if (error.response.status === 401) {
        console.log('\n🔍 This 401 error suggests:');
        console.log('1. The credentials might be correct but in wrong format');
        console.log('2. There might be an issue with how the request is processed');
        console.log('3. The backend might be expecting additional headers');
        console.log('4. There could be middleware intercepting the request');
      }
    } else if (error.request) {
      console.error('❌ No response received:', error.request);
    }
    
    return false;
  }
}

// Run the test
testAdminLogin().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Script execution error:', err);
  process.exit(1);
});
