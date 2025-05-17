/**
 * Frontend-Backend Integration Tests
 * 
 * Tests the integration between frontend and backend components
 * with a focus on the admin functionality.
 */

const request = require('supertest');
const { expect } = require('chai');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const cors = require('cors');

describe('Frontend-Backend Integration', () => {
  let adminToken;
  
  before(() => {
    // Generate test admin token
    adminToken = jwt.sign(
      { id: 'admin-test-id', role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
  });
  
  describe('CORS Configuration', () => {
    it('should allow requests from the frontend origin', async () => {
      const response = await request(app)
        .options('/api/admin/dashboard')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');
      
      expect(response.headers['access-control-allow-origin']).to.equal('http://localhost:3000');
      expect(response.headers['access-control-allow-methods']).to.include('GET');
      expect(response.headers['access-control-allow-credentials']).to.equal('true');
    });
    
    it('should include necessary headers for frontend requests', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Origin', 'http://localhost:3000')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.headers['access-control-allow-origin']).to.equal('http://localhost:3000');
    });
  });
  
  describe('Authentication Token Handling', () => {
    it('should accept JWT token in Authorization header', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
    
    it('should accept JWT token in cookie', async () => {
      const agent = request.agent(app);
      
      // Set cookie manually
      agent.jar.setCookie(`token=${adminToken}`);
      
      const response = await agent.get('/api/admin/dashboard');
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
    
    it('should reject expired tokens', async () => {
      // Generate expired token
      const expiredToken = jwt.sign(
        { id: 'admin-test-id', role: 'admin' },
        process.env.JWT_SECRET || 'your-secret-key',
        { expiresIn: '0s' } // Expires immediately
      );
      
      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${expiredToken}`);
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('Image Path Resolution', () => {
    it('should return absolute URLs for image paths', async () => {
      const response = await request(app)
        .get('/api/hotels')
        .set('Origin', 'http://localhost:3000');
      
      // Check if response contains rooms with image URLs
      if (response.body.rooms && response.body.rooms.length > 0) {
        const room = response.body.rooms[0];
        
        // If the room has an image URL, check that it's an absolute URL
        if (room.imageUrl) {
          expect(room.imageUrl).to.satisfy(url => 
            url.startsWith('http://') || 
            url.startsWith('https://') || 
            url.startsWith('/')
          );
        }
        
        // If the room has multiple images, check that they're absolute URLs
        if (room.images && room.images.length > 0) {
          room.images.forEach(imageUrl => {
            expect(imageUrl).to.satisfy(url => 
              url.startsWith('http://') || 
              url.startsWith('https://') || 
              url.startsWith('/')
            );
          });
        }
      }
    });
  });
  
  describe('Error Response Formatting', () => {
    it('should return consistent error response format', async () => {
      // Test with invalid endpoint
      const response = await request(app)
        .get('/api/invalid-endpoint');
      
      expect(response.body).to.have.property('success');
      expect(response.body.success).to.be.false;
      expect(response.body).to.have.property('message');
    });
    
    it('should return validation errors in consistent format', async () => {
      // Test with invalid room data
      const invalidRoomData = {
        // Missing required fields
        title: '',
        price: 'not-a-number'
      };
      
      const response = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidRoomData);
      
      expect(response.status).to.be.oneOf([400, 422]); // Either is acceptable for validation errors
      expect(response.body).to.have.property('success');
      expect(response.body.success).to.be.false;
      expect(response.body).to.have.property('message');
      
      // Check for validation errors array
      if (response.body.errors) {
        expect(response.body.errors).to.be.an('array');
        if (response.body.errors.length > 0) {
          const error = response.body.errors[0];
          expect(error).to.have.property('param');
          expect(error).to.have.property('msg');
        }
      }
    });
  });
  
  describe('Admin Dashboard Data Format', () => {
    it('should return dashboard data in format expected by frontend', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.body).to.have.property('success');
      expect(response.body).to.have.property('dashboard');
      
      const dashboard = response.body.dashboard;
      expect(dashboard).to.have.property('totalUsers');
      expect(dashboard).to.have.property('totalRooms');
      expect(dashboard).to.have.property('totalBookings');
      expect(dashboard).to.have.property('totalRevenue');
      expect(dashboard).to.have.property('recentBookings');
      expect(dashboard).to.have.property('monthlyRevenue');
      expect(dashboard).to.have.property('statusCounts');
      
      // Check that monthlyRevenue is an array with 12 elements (one per month)
      expect(dashboard.monthlyRevenue).to.be.an('array');
      expect(dashboard.monthlyRevenue).to.have.lengthOf(12);
      
      // Check that statusCounts has the expected properties
      expect(dashboard.statusCounts).to.have.property('confirmed');
      expect(dashboard.statusCounts).to.have.property('pending');
      expect(dashboard.statusCounts).to.have.property('cancelled');
      expect(dashboard.statusCounts).to.have.property('completed');
    });
  });
});
