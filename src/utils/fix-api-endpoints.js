/**
 * API Endpoint Fixer
 * 
 * This script diagnoses and fixes issues with API endpoints
 * by checking route configurations, controller implementations,
 * and middleware setup.
 */

require('dotenv').config();
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { supabaseClient } = require('../config/supabase');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:10000/api';

/**
 * Run diagnostics on API endpoints
 */
async function runDiagnostics() {
  console.log('🔍 Running API endpoint diagnostics...');
  console.log('-----------------------------------');

  try {
    // Check server configuration
    await checkServerConfiguration();
    
    // Check route registrations
    await checkRouteRegistrations();
    
    // Check controller implementations
    await checkControllerImplementations();
    
    // Check middleware setup
    await checkMiddlewareSetup();
    
    // Generate recommendations
    generateRecommendations();
    
    console.log('-----------------------------------');
    console.log('✅ Diagnostics completed!');
    console.log('Please review the recommendations above to fix the remaining issues.');
  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
  }
}

/**
 * Check server configuration
 */
async function checkServerConfiguration() {
  console.log('🔍 Checking server configuration...');
  
  try {
    // Check if server.js exists
    const serverPath = path.join(__dirname, '..', 'server.js');
    if (!fs.existsSync(serverPath)) {
      console.error('❌ server.js not found');
      return;
    }
    
    // Read server.js content
    const serverContent = fs.readFileSync(serverPath, 'utf8');
    
    // Check route registrations
    const routeRegistrations = {
      auth: serverContent.includes('/api/auth'),
      hotels: serverContent.includes('/api/hotels'),
      rooms: serverContent.includes('/api/rooms'),
      bookings: serverContent.includes('/api/bookings'),
      users: serverContent.includes('/api/users'),
      admin: serverContent.includes('/api/admin'),
      adminAuth: serverContent.includes('/api/admin/auth')
    };
    
    console.log('Route registrations in server.js:');
    Object.entries(routeRegistrations).forEach(([route, registered]) => {
      console.log(`   ${route}: ${registered ? '✅' : '❌'}`);
    });
    
    // Check middleware registrations
    const middlewareRegistrations = {
      cors: serverContent.includes('cors('),
      helmet: serverContent.includes('helmet('),
      morgan: serverContent.includes('morgan('),
      cookieParser: serverContent.includes('cookieParser('),
      json: serverContent.includes('express.json('),
      urlencoded: serverContent.includes('express.urlencoded('),
      errorHandler: serverContent.includes('errorHandler')
    };
    
    console.log('\nMiddleware registrations in server.js:');
    Object.entries(middlewareRegistrations).forEach(([middleware, registered]) => {
      console.log(`   ${middleware}: ${registered ? '✅' : '❌'}`);
    });
  } catch (error) {
    console.error('❌ Server configuration check failed:', error.message);
  }
}

/**
 * Check route registrations
 */
async function checkRouteRegistrations() {
  console.log('\n🔍 Checking route registrations...');
  
  try {
    // Check if route files exist
    const routeFiles = [
      { name: 'auth.routes.js', path: path.join(__dirname, '..', 'routes', 'auth.routes.js') },
      { name: 'room.routes.js', path: path.join(__dirname, '..', 'routes', 'room.routes.js') },
      { name: 'booking.routes.js', path: path.join(__dirname, '..', 'routes', 'booking.routes.js') },
      { name: 'user.routes.js', path: path.join(__dirname, '..', 'routes', 'user.routes.js') },
      { name: 'admin.routes.js', path: path.join(__dirname, '..', 'routes', 'admin.routes.js') },
      { name: 'admin.auth.routes.js', path: path.join(__dirname, '..', 'routes', 'admin.auth.routes.js') },
      { name: 'admin.room.routes.js', path: path.join(__dirname, '..', 'routes', 'admin.room.routes.js') },
      { name: 'admin.booking.routes.js', path: path.join(__dirname, '..', 'routes', 'admin.booking.routes.js') }
    ];
    
    console.log('Route files:');
    for (const routeFile of routeFiles) {
      const exists = fs.existsSync(routeFile.path);
      console.log(`   ${routeFile.name}: ${exists ? '✅' : '❌'}`);
      
      if (exists) {
        // Check route implementations
        const routeContent = fs.readFileSync(routeFile.path, 'utf8');
        
        // Check if router is exported
        const exportsRouter = routeContent.includes('module.exports = router');
        if (!exportsRouter) {
          console.log(`   ⚠️ ${routeFile.name} does not export router`);
        }
        
        // Check if routes are defined
        const hasRoutes = routeContent.includes('router.get(') || 
                          routeContent.includes('router.post(') || 
                          routeContent.includes('router.put(') || 
                          routeContent.includes('router.delete(');
        if (!hasRoutes) {
          console.log(`   ⚠️ ${routeFile.name} does not define any routes`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Route registrations check failed:', error.message);
  }
}

/**
 * Check controller implementations
 */
async function checkControllerImplementations() {
  console.log('\n🔍 Checking controller implementations...');
  
  try {
    // Check if controller files exist
    const controllerFiles = [
      { name: 'auth.controller.js', path: path.join(__dirname, '..', 'controllers', 'auth.controller.js') },
      { name: 'room.controller.js', path: path.join(__dirname, '..', 'controllers', 'room.controller.js') },
      { name: 'booking.controller.js', path: path.join(__dirname, '..', 'controllers', 'booking.controller.js') },
      { name: 'user.controller.js', path: path.join(__dirname, '..', 'controllers', 'user.controller.js') },
      { name: 'admin.controller.js', path: path.join(__dirname, '..', 'controllers', 'admin.controller.js') }
    ];
    
    console.log('Controller files:');
    for (const controllerFile of controllerFiles) {
      const exists = fs.existsSync(controllerFile.path);
      console.log(`   ${controllerFile.name}: ${exists ? '✅' : '❌'}`);
      
      if (exists) {
        // Check controller implementations
        const controllerContent = fs.readFileSync(controllerFile.path, 'utf8');
        
        // Check for common issues
        if (controllerContent.includes('return next(new AppError(')) {
          console.log(`   ✅ ${controllerFile.name} uses proper error handling`);
        } else {
          console.log(`   ⚠️ ${controllerFile.name} may not use proper error handling`);
        }
        
        if (controllerContent.includes('try {') && controllerContent.includes('catch (error) {')) {
          console.log(`   ✅ ${controllerFile.name} uses try-catch blocks`);
        } else {
          console.log(`   ⚠️ ${controllerFile.name} may not use try-catch blocks`);
        }
      }
    }
  } catch (error) {
    console.error('❌ Controller implementations check failed:', error.message);
  }
}

/**
 * Check middleware setup
 */
async function checkMiddlewareSetup() {
  console.log('\n🔍 Checking middleware setup...');
  
  try {
    // Check if middleware files exist
    const middlewareFiles = [
      { name: 'auth.middleware.js', path: path.join(__dirname, '..', 'middleware', 'auth.middleware.js') },
      { name: 'errorHandler.js', path: path.join(__dirname, '..', 'middleware', 'errorHandler.js') },
      { name: 'roomUpload.middleware.js', path: path.join(__dirname, '..', 'middleware', 'roomUpload.middleware.js') }
    ];
    
    console.log('Middleware files:');
    for (const middlewareFile of middlewareFiles) {
      const exists = fs.existsSync(middlewareFile.path);
      console.log(`   ${middlewareFile.name}: ${exists ? '✅' : '❌'}`);
      
      if (exists) {
        // Check middleware implementations
        const middlewareContent = fs.readFileSync(middlewareFile.path, 'utf8');
        
        // Check for common issues
        if (middlewareFile.name === 'auth.middleware.js') {
          if (middlewareContent.includes('exports.verifyToken') && middlewareContent.includes('exports.isAdmin')) {
            console.log(`   ✅ ${middlewareFile.name} implements verifyToken and isAdmin`);
          } else {
            console.log(`   ⚠️ ${middlewareFile.name} may not implement required auth middleware`);
          }
        }
        
        if (middlewareFile.name === 'errorHandler.js') {
          if (middlewareContent.includes('module.exports = (err, req, res, next)')) {
            console.log(`   ✅ ${middlewareFile.name} implements error handler middleware`);
          } else {
            console.log(`   ⚠️ ${middlewareFile.name} may not implement error handler middleware`);
          }
        }
      }
    }
  } catch (error) {
    console.error('❌ Middleware setup check failed:', error.message);
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations() {
  console.log('\n📋 RECOMMENDATIONS:');
  
  console.log(`
1. Room Creation/Update (500 Error):
   - Check room.controller.js for proper error handling in createRoom and updateRoom functions
   - Verify that all required fields are validated in the request body
   - Check if the uploadRoomImages middleware is properly handling file uploads
   - Ensure that the Supabase client has proper permissions to create/update rooms

2. Public Room Endpoints (500/404 Errors):
   - Verify that room.routes.js correctly implements GET /hotels and GET /hotels/categories endpoints
   - Check if the room controller properly handles these routes
   - Ensure that the routes are registered in server.js

3. Admin Room Management (500 Error):
   - Check if admin.room.routes.js is properly registered in admin.routes.js
   - Verify that the room controller functions are properly implemented for admin routes
   - Ensure that the admin middleware is correctly applied

4. Admin Booking Management (500 Error):
   - Check if admin.booking.routes.js is properly registered in admin.routes.js
   - Verify that the booking controller functions are properly implemented for admin routes
   - Ensure that the admin middleware is correctly applied

5. Booking Creation (400 Error):
   - Check booking.controller.js for proper validation of booking creation requests
   - Verify that all required fields are validated in the request body
   - Ensure that the room availability check is properly implemented
  `);
}

// Run diagnostics
runDiagnostics();
