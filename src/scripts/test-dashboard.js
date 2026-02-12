const fetch = require('node-fetch');

async function testDashboardAccess() {
  console.log('Testing Admin Dashboard Access...');
  
  try {
    // 1. Login to get token
    const loginResponse = await fetch('http://localhost:10000/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@example.com',
        password: 'adminpassword123'
      })
    });

    const loginData = await loginResponse.json();
    
    if (!loginResponse.ok) {
      console.log('Login Failed:', loginData.message);
      return;
    }
    
    const token = loginData.token;
    console.log('Login successful, token received.');

    // 2. Access Dashboard
    const dashboardResponse = await fetch('http://localhost:10000/api/admin/dashboard', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (dashboardResponse.ok) {
      const dashboardData = await dashboardResponse.json();
      console.log('Dashboard Access Successful!');
      console.log('Data:', JSON.stringify(dashboardData, null, 2));
    } else {
      console.log('Dashboard Access Failed:', dashboardResponse.status);
      const text = await dashboardResponse.text();
      console.log('Response:', text);
    }

  } catch (error) {
    console.error('Network Error:', error.message);
  }
}

if (!globalThis.fetch) {
    console.log("Native fetch not found. Running on Node " + process.version);
}

testDashboardAccess();
