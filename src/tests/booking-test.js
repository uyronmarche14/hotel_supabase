/**
 * Booking System Integration Test
 * Tests the booking endpoints to ensure proper frontend-backend integration
 */

require('dotenv').config();
const { supabaseClient } = require('../config/supabase');
const axios = require('axios');

const API_URL = process.env.API_URL || 'http://localhost:10000/api';
let authToken = '';
let userId = '';
let roomId = '';
let bookingId = '';

// Test user credentials
const testUser = {
  email: 'test.user@example.com',
  password: 'Test@123456',
  name: 'Test User'
};

// Test booking data
const testBooking = {
  checkIn: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
  checkOut: new Date(Date.now() + (86400000 * 3)).toISOString().split('T')[0], // 3 days from now
  adults: 2,
  children: 1,
  paymentMethod: 'credit_card',
  specialRequests: 'Test booking request',
  nights: 2
};

/**
 * Setup test environment
 */
async function setup() {
  try {
    console.log('Setting up test environment...');
    
    // 1. Get first user from the database for testing
    const { data: users, error: userError } = await supabaseClient
      .from('users')
      .select('id, email')
      .limit(1);
    
    if (userError || !users.length) {
      throw new Error('No users found for testing');
    }
    
    userId = users[0].id;
    testUser.email = users[0].email;
    console.log(`Using existing user: ${testUser.email} for testing`);
    
    // Note: For testing, we'll use the login endpoint directly instead of creating a new user
    
    // 2. Get a room for testing
    const { data: rooms, error: roomError } = await supabaseClient
      .from('rooms')
      .select('id, price')
      .eq('is_available', true)
      .limit(1);
    
    if (roomError || !rooms.length) throw new Error('No available rooms found for testing');
    roomId = rooms[0].id;
    
    // Calculate total price
    testBooking.roomId = roomId;
    testBooking.totalPrice = rooms[0].price * testBooking.nights;
    
    console.log('Test environment setup complete.');
  } catch (error) {
    console.error('Setup failed:', error.message);
    process.exit(1);
  }
}

/**
 * Login test user and get auth token
 */
async function login() {
  try {
    console.log('Generating test JWT token...');
    
    // For testing purposes, we'll generate a JWT token directly
    // This is a simplified approach for testing only
    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret';
    
    // Create a token that expires in 1 hour
    authToken = jwt.sign(
      { 
        id: userId,
        email: testUser.email,
        role: 'user' 
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    
    console.log('Test token generated successfully');
    return true;
  } catch (error) {
    console.error('Token generation failed:', error.message);
    return false;
  }
}

/**
 * Test creating a booking
 */
async function testCreateBooking() {
  try {
    console.log('\nTesting create booking...');
    const response = await axios.post(`${API_URL}/bookings`, testBooking, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Create booking failed');
    
    bookingId = response.data.booking.id;
    console.log('Create booking successful:', response.data.booking);
    return true;
  } catch (error) {
    console.error('Create booking failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test getting user bookings
 */
async function testGetUserBookings() {
  try {
    console.log('\nTesting get user bookings...');
    const response = await axios.get(`${API_URL}/bookings`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Get user bookings failed');
    
    console.log(`Retrieved ${response.data.count} bookings`);
    return true;
  } catch (error) {
    console.error('Get user bookings failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test getting booking by ID
 */
async function testGetBookingById() {
  try {
    console.log('\nTesting get booking by ID...');
    const response = await axios.get(`${API_URL}/bookings/${bookingId}`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Get booking by ID failed');
    
    console.log('Get booking by ID successful:', response.data.booking.id);
    return true;
  } catch (error) {
    console.error('Get booking by ID failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test booking summary
 */
async function testBookingSummary() {
  try {
    console.log('\nTesting booking summary...');
    const response = await axios.get(`${API_URL}/bookings/summary`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Get booking summary failed');
    
    console.log('Booking summary:', response.data.summary);
    return true;
  } catch (error) {
    console.error('Get booking summary failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test booking history
 */
async function testBookingHistory() {
  try {
    console.log('\nTesting booking history...');
    const response = await axios.get(`${API_URL}/bookings/history`, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Get booking history failed');
    
    console.log('Booking history stats:', response.data.history.stats);
    return true;
  } catch (error) {
    console.error('Get booking history failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Test cancelling a booking
 */
async function testCancelBooking() {
  try {
    console.log('\nTesting cancel booking...');
    const response = await axios.put(`${API_URL}/bookings/${bookingId}/cancel`, {}, {
      headers: { Authorization: `Bearer ${authToken}` }
    });
    
    if (!response.data.success) throw new Error('Cancel booking failed');
    
    console.log('Cancel booking successful:', response.data.booking.status);
    return true;
  } catch (error) {
    console.error('Cancel booking failed:', error.response?.data?.message || error.message);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  try {
    await setup();
    
    if (!await login()) {
      console.error('Tests aborted due to login failure');
      return;
    }
    
    // Run tests
    const createSuccess = await testCreateBooking();
    if (!createSuccess) {
      console.error('Tests aborted due to create booking failure');
      return;
    }
    
    await testGetUserBookings();
    await testGetBookingById();
    await testBookingSummary();
    await testBookingHistory();
    await testCancelBooking();
    
    console.log('\nAll tests completed');
  } catch (error) {
    console.error('Test execution failed:', error.message);
  }
}

// Run the tests
runTests();
