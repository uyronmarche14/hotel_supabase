/**
 * Integration Tests for Admin Routes
 * 
 * Tests the admin API endpoints by making actual HTTP requests
 * to a test server and verifying the responses.
 */

const request = require('supertest');
const { expect } = require('chai');
const sinon = require('sinon');
const jwt = require('jsonwebtoken');
const app = require('../../server');
const { supabaseClient } = require('../../config/supabase');

describe('Admin API Endpoints', () => {
  let adminToken;
  let userToken;
  
  before(() => {
    // Generate test tokens
    adminToken = jwt.sign(
      { id: 'admin-test-id', role: 'admin' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    userToken = jwt.sign(
      { id: 'user-test-id', role: 'user' },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    // Mock Supabase client for user verification
    sinon.stub(supabaseClient, 'from').returns({
      select: sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().returns({
            data: {
              id: 'admin-test-id',
              name: 'Admin Test',
              email: 'admin@example.com',
              role: 'admin',
              profile_pic: '/images/admin.jpg'
            },
            error: null
          })
        })
      })
    });
  });
  
  after(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard statistics for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.dashboard).to.exist;
      expect(response.body.dashboard.totalUsers).to.be.a('number');
      expect(response.body.dashboard.totalRooms).to.be.a('number');
      expect(response.body.dashboard.totalBookings).to.be.a('number');
      expect(response.body.dashboard.totalRevenue).to.be.a('number');
      expect(response.body.dashboard.recentBookings).to.be.an('array');
    });
    
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard');
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
    
    it('should return 403 for non-admin users', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${userToken}`);
      
      expect(response.status).to.equal(403);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('GET /api/admin/system-health', () => {
    it('should return system health status for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/system-health')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.health).to.exist;
      expect(response.body.health.status).to.be.a('string');
      expect(response.body.health.timestamp).to.be.a('string');
      expect(response.body.health.database).to.exist;
    });
    
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/system-health');
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('GET /api/admin/users', () => {
    it('should return all users for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.users).to.be.an('array');
    });
    
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/users');
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('GET /api/admin/users/:id', () => {
    it('should return a specific user for admin users', async () => {
      const userId = 'test-user-id';
      
      const response = await request(app)
        .get(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.user).to.exist;
    });
    
    it('should return 401 for requests without token', async () => {
      const userId = 'test-user-id';
      
      const response = await request(app)
        .get(`/api/admin/users/${userId}`);
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('PUT /api/admin/users/:id', () => {
    it('should update a user for admin users', async () => {
      const userId = 'test-user-id';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      
      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.user).to.exist;
    });
    
    it('should return 401 for requests without token', async () => {
      const userId = 'test-user-id';
      const updateData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      
      const response = await request(app)
        .put(`/api/admin/users/${userId}`)
        .send(updateData);
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('DELETE /api/admin/users/:id', () => {
    it('should delete a user for admin users', async () => {
      const userId = 'test-user-id';
      
      const response = await request(app)
        .delete(`/api/admin/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
    });
    
    it('should return 401 for requests without token', async () => {
      const userId = 'test-user-id';
      
      const response = await request(app)
        .delete(`/api/admin/users/${userId}`);
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('GET /api/admin/rooms', () => {
    it('should return all rooms for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.rooms).to.be.an('array');
    });
    
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/rooms');
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('POST /api/admin/rooms', () => {
    it('should create a room for admin users', async () => {
      const roomData = {
        title: 'Test Room',
        description: 'A test room',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard'
      };
      
      const response = await request(app)
        .post('/api/admin/rooms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(roomData);
      
      expect(response.status).to.equal(201);
      expect(response.body.success).to.be.true;
      expect(response.body.room).to.exist;
    });
    
    it('should return 401 for requests without token', async () => {
      const roomData = {
        title: 'Test Room',
        description: 'A test room',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard'
      };
      
      const response = await request(app)
        .post('/api/admin/rooms')
        .send(roomData);
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
  
  describe('GET /api/admin/bookings', () => {
    it('should return all bookings for admin users', async () => {
      const response = await request(app)
        .get('/api/admin/bookings')
        .set('Authorization', `Bearer ${adminToken}`);
      
      expect(response.status).to.equal(200);
      expect(response.body.success).to.be.true;
      expect(response.body.bookings).to.be.an('array');
    });
    
    it('should return 401 for requests without token', async () => {
      const response = await request(app)
        .get('/api/admin/bookings');
      
      expect(response.status).to.equal(401);
      expect(response.body.success).to.be.false;
    });
  });
});
