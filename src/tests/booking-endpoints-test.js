/**
 * Booking Endpoints Test
 * Verifies that booking endpoints are correctly structured for frontend integration
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');

// Define expected endpoints for frontend integration
const expectedEndpoints = {
  '/api/bookings': {
    methods: ['GET', 'POST'],
    description: 'Get all user bookings / Create a new booking'
  },
  '/api/bookings/check-availability': {
    methods: ['GET'],
    description: 'Check room availability for booking'
  },
  '/api/bookings/:id': {
    methods: ['GET'],
    description: 'Get a specific booking by ID'
  },
  '/api/bookings/:id/cancel': {
    methods: ['PUT'],
    description: 'Cancel a booking'
  },
  '/api/bookings/summary': {
    methods: ['GET'],
    description: 'Get booking summary (counts of upcoming and past bookings)'
  },
  '/api/bookings/history': {
    methods: ['GET'],
    description: 'Get booking history with stats'
  },
  '/api/admin/bookings': {
    methods: ['GET'],
    description: 'Get all bookings (admin only)'
  },
  '/api/admin/bookings/:id': {
    methods: ['GET'],
    description: 'Get a specific booking by ID (admin only)'
  },
  '/api/admin/bookings/:id/status': {
    methods: ['PUT'],
    description: 'Update booking status (admin only)'
  }
};

/**
 * Check if booking routes file exists and contains expected routes
 */
function checkBookingRoutes() {
  console.log('Checking booking routes...');
  
  const bookingRoutesPath = path.join(__dirname, '../routes/booking.routes.js');
  const adminBookingRoutesPath = path.join(__dirname, '../routes/admin.booking.routes.js');
  
  // Check if files exist
  const bookingRoutesExist = fs.existsSync(bookingRoutesPath);
  const adminBookingRoutesExist = fs.existsSync(adminBookingRoutesPath);
  
  console.log(`Booking routes file exists: ${bookingRoutesExist}`);
  console.log(`Admin booking routes file exists: ${adminBookingRoutesExist}`);
  
  if (bookingRoutesExist) {
    // Read file content
    const bookingRoutesContent = fs.readFileSync(bookingRoutesPath, 'utf8');
    
    // Check for expected route patterns
    console.log('\nChecking for expected routes in booking.routes.js:');
    
    const routePatterns = [
      { pattern: /router\.get\(['"`]\/['""`]/, description: 'GET /api/bookings' },
      { pattern: /router\.post\(['"`]\/['""`]/, description: 'POST /api/bookings' },
      { pattern: /router\.get\(['"`]\/check-availability['""`]/, description: 'GET /api/bookings/check-availability' },
      { pattern: /router\.get\(['"`]\/:id['""`]/, description: 'GET /api/bookings/:id' },
      { pattern: /router\.put\(['"`]\/:id\/cancel['""`]/, description: 'PUT /api/bookings/:id/cancel' },
      { pattern: /router\.get\(['"`]\/summary['""`]/, description: 'GET /api/bookings/summary' },
      { pattern: /router\.get\(['"`]\/history['""`]/, description: 'GET /api/bookings/history' }
    ];
    
    routePatterns.forEach(({ pattern, description }) => {
      const exists = pattern.test(bookingRoutesContent);
      console.log(`- ${description}: ${exists ? '✅ Found' : '❌ Not found'}`);
    });
  }
  
  if (adminBookingRoutesExist) {
    // Read file content
    const adminBookingRoutesContent = fs.readFileSync(adminBookingRoutesPath, 'utf8');
    
    // Check for expected route patterns
    console.log('\nChecking for expected routes in admin.booking.routes.js:');
    
    const adminRoutePatterns = [
      { pattern: /router\.get\(['"`]\/['""`]/, description: 'GET /api/admin/bookings' },
      { pattern: /router\.get\(['"`]\/:id['""`]/, description: 'GET /api/admin/bookings/:id' },
      { pattern: /router\.put\(['"`]\/:id\/status['""`]/, description: 'PUT /api/admin/bookings/:id/status' }
    ];
    
    adminRoutePatterns.forEach(({ pattern, description }) => {
      const exists = pattern.test(adminBookingRoutesContent);
      console.log(`- ${description}: ${exists ? '✅ Found' : '❌ Not found'}`);
    });
  }
}

/**
 * Check if booking controller file exists and contains expected methods
 */
function checkBookingController() {
  console.log('\nChecking booking controller...');
  
  const bookingControllerPath = path.join(__dirname, '../controllers/booking.controller.js');
  
  // Check if file exists
  const bookingControllerExists = fs.existsSync(bookingControllerPath);
  
  console.log(`Booking controller file exists: ${bookingControllerExists}`);
  
  if (bookingControllerExists) {
    // Read file content
    const bookingControllerContent = fs.readFileSync(bookingControllerPath, 'utf8');
    
    // Check for expected methods
    console.log('\nChecking for expected methods in booking.controller.js:');
    
    const methodPatterns = [
      { pattern: /exports\.getUserBookings\s*=/, description: 'getUserBookings method' },
      { pattern: /exports\.getBookingById\s*=/, description: 'getBookingById method' },
      { pattern: /exports\.createBooking\s*=/, description: 'createBooking method' },
      { pattern: /exports\.checkRoomAvailability\s*=/, description: 'checkRoomAvailability method' },
      { pattern: /exports\.cancelBooking\s*=/, description: 'cancelBooking method' },
      { pattern: /exports\.getAllBookings\s*=/, description: 'getAllBookings method (admin)' },
      { pattern: /exports\.updateBookingStatus\s*=/, description: 'updateBookingStatus method (admin)' }
    ];
    
    methodPatterns.forEach(({ pattern, description }) => {
      const exists = pattern.test(bookingControllerContent);
      console.log(`- ${description}: ${exists ? '✅ Found' : '❌ Not found'}`);
    });
  }
}

/**
 * Check if booking validation middleware exists
 */
function checkBookingMiddleware() {
  console.log('\nChecking booking validation middleware...');
  
  const bookingMiddlewarePath = path.join(__dirname, '../middleware/booking.middleware.js');
  
  // Check if file exists
  const bookingMiddlewareExists = fs.existsSync(bookingMiddlewarePath);
  
  console.log(`Booking middleware file exists: ${bookingMiddlewareExists}`);
  
  if (bookingMiddlewareExists) {
    // Read file content
    const bookingMiddlewareContent = fs.readFileSync(bookingMiddlewarePath, 'utf8');
    
    // Check for expected validation methods
    console.log('\nChecking for expected validation methods in booking.middleware.js:');
    
    const validationPatterns = [
      { pattern: /exports\.validateCreateBooking\s*=/, description: 'validateCreateBooking method' },
      { pattern: /exports\.validateUpdateBooking\s*=/, description: 'validateUpdateBooking method' },
      { pattern: /exports\.validateCheckAvailability\s*=/, description: 'validateCheckAvailability method' },
      { pattern: /exports\.validateStatusUpdate\s*=/, description: 'validateStatusUpdate method' }
    ];
    
    validationPatterns.forEach(({ pattern, description }) => {
      const exists = pattern.test(bookingMiddlewareContent);
      console.log(`- ${description}: ${exists ? '✅ Found' : '❌ Not found'}`);
    });
  }
}

/**
 * Run all checks
 */
function runTests() {
  console.log('Running booking endpoints integration tests...');
  console.log('==============================================\n');
  
  checkBookingRoutes();
  checkBookingController();
  checkBookingMiddleware();
  
  console.log('\n==============================================');
  console.log('Booking endpoints integration tests completed');
}

// Run the tests
runTests();
