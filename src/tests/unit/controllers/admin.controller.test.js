/**
 * Unit Tests for Admin Controller
 * 
 * Tests the admin controller functions in isolation
 * using mocks for the database and other dependencies.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const adminController = require('../../../controllers/admin.controller');
const { supabaseClient } = require('../../../config/supabase');

describe('Admin Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      user: { id: 'test-admin-id', role: 'admin' }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    next = sinon.spy();
    
    // Mock Supabase client
    sinon.stub(supabaseClient, 'from').returnsThis();
    sinon.stub(supabaseClient, 'select').returnsThis();
    sinon.stub(supabaseClient, 'count').returnsThis();
    sinon.stub(supabaseClient, 'eq').returnsThis();
    sinon.stub(supabaseClient, 'order').returnsThis();
    sinon.stub(supabaseClient, 'limit').returnsThis();
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('getDashboardStats', () => {
    it('should return dashboard statistics with 200 status code', async () => {
      // Mock Supabase responses
      const userCountResponse = { count: 10, error: null };
      const roomCountResponse = { count: 20, error: null };
      const bookingCountResponse = { count: 30, error: null };
      const revenueResponse = { data: [{ total_price: 100 }, { total_price: 200 }], error: null };
      const recentBookingsResponse = { 
        data: [
          { 
            id: 'booking1', 
            user_id: 'user1', 
            room_id: 'room1',
            check_in: '2025-05-20',
            check_out: '2025-05-25',
            total_price: 500,
            status: 'confirmed',
            created_at: new Date().toISOString()
          }
        ], 
        error: null 
      };
      const statusDataResponse = {
        data: [
          { status: 'confirmed' },
          { status: 'confirmed' },
          { status: 'pending' },
          { status: 'cancelled' }
        ],
        error: null
      };
      
      // Set up the stub chain for each query
      supabaseClient.from.withArgs('users').returns({
        select: sinon.stub().returns({
          count: sinon.stub().returns(userCountResponse)
        })
      });
      
      supabaseClient.from.withArgs('rooms').returns({
        select: sinon.stub().returns({
          count: sinon.stub().returns(roomCountResponse)
        })
      });
      
      supabaseClient.from.withArgs('bookings').returns({
        select: sinon.stub().returns({
          count: sinon.stub().returns(bookingCountResponse)
        })
      });
      
      // For revenue
      supabaseClient.from.withArgs('bookings').returns({
        select: sinon.stub().returns({
          eq: sinon.stub().returns(revenueResponse)
        })
      });
      
      // For recent bookings
      supabaseClient.from.withArgs('bookings').returns({
        select: sinon.stub().returns({
          order: sinon.stub().returns({
            limit: sinon.stub().returns(recentBookingsResponse)
          })
        })
      });
      
      // For status counts
      supabaseClient.from.withArgs('bookings').returns({
        select: sinon.stub().returns(statusDataResponse)
      });
      
      // Call the controller function
      await adminController.getDashboardStats(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.dashboard).to.exist;
      expect(response.dashboard.totalUsers).to.equal(10);
      expect(response.dashboard.totalRooms).to.equal(20);
      expect(response.dashboard.totalBookings).to.equal(30);
    });
    
    it('should handle database errors and pass to next middleware', async () => {
      // Mock database error
      const errorResponse = { error: new Error('Database error') };
      
      supabaseClient.from.withArgs('users').returns({
        select: sinon.stub().returns({
          count: sinon.stub().returns(errorResponse)
        })
      });
      
      // Call the controller function
      await adminController.getDashboardStats(req, res, next);
      
      // Assertions
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
    });
  });
  
  describe('getSystemHealth', () => {
    it('should return system health status with 200 status code', async () => {
      // Mock Supabase response for database health check
      const healthCheckResponse = { data: {}, error: null };
      
      supabaseClient.from.withArgs('users').returns({
        select: sinon.stub().returns({
          limit: sinon.stub().returns(healthCheckResponse)
        })
      });
      
      // Call the controller function
      await adminController.getSystemHealth(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('healthy');
      expect(response.health.timestamp).to.exist;
      expect(response.health.database).to.exist;
      expect(response.health.database.status).to.equal('healthy');
    });
    
    it('should report database issues when database check fails', async () => {
      // Mock database error
      const errorResponse = { error: new Error('Database error') };
      
      supabaseClient.from.withArgs('users').returns({
        select: sinon.stub().returns({
          limit: sinon.stub().returns(errorResponse)
        })
      });
      
      // Call the controller function
      await adminController.getSystemHealth(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('degraded');
      expect(response.health.database.status).to.equal('unhealthy');
    });
  });
});
