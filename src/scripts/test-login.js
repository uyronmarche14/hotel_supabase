const fetch = require('node-fetch'); // You might need to install this or use built-in fetch if node version supports it (v18+)

// Helper to wait
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function testAdminLogin() {
  console.log('Testing Admin Login...');
  
  try {
    const response = await fetch('http://localhost:10000/api/auth/admin-login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'adminpassword123'
      })
    });

    const data = await response.json();
    
    if (response.ok) {
      console.log('Login Successful!');
      console.log('User:', data.user.email);
      console.log('Role:', data.user.role);
    } else {
      console.log('Login Failed:', response.status);
      console.log('Message:', data.message);
    }
  } catch (error) {
    console.error('Network Error:', error.message);
  }
}

// Check node version for fetch support, otherwise require it check
if (!globalThis.fetch) {
    console.log("Native fetch not found, this script might fail if node-fetch isn't installed. Running on Node " + process.version);
}

testAdminLogin();
