/**
 * Simplified Unit Tests for Admin Controller
 * 
 * Tests the admin controller functions with simplified mocking
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
      params: {
        id: 'test-id'
      },
      query: {},
      user: {
        id: 'admin-id',
        role: 'admin'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    next = sinon.spy();
    
    // Stub the Supabase client
    sinon.stub(supabaseClient);
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Create a complete mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock users count
      const mockUsersQuery = {
        count: sinon.stub().resolves({ count: 10, error: null })
      };
      
      // Mock rooms count
      const mockRoomsQuery = {
        count: sinon.stub().resolves({ count: 20, error: null })
      };
      
      // Mock bookings count
      const mockBookingsQuery = {
        count: sinon.stub().resolves({ count: 30, error: null })
      };
      
      // Mock recent bookings
      const mockRecentBookingsQuery = {
        select: sinon.stub().returns({
          eq: sinon.stub().returns({
            order: sinon.stub().returns({
              limit: sinon.stub().resolves({
                data: [
                  { id: 'booking-1', user_id: 'user-1', room_id: 'room-1', total_price: 200, status: 'confirmed' },
                  { id: 'booking-2', user_id: 'user-2', room_id: 'room-2', total_price: 300, status: 'pending' }
                ],
                error: null
              })
            })
          })
        })
      };
      
      // Mock bookings for revenue calculation
      const mockRevenueQuery = {
        select: sinon.stub().returns({
          gte: sinon.stub().returns({
            lt: sinon.stub().resolves({
              data: [
                { id: 'booking-1', total_price: 200, created_at: new Date().toISOString() },
                { id: 'booking-2', total_price: 300, created_at: new Date().toISOString() }
              ],
              error: null
            })
          })
        })
      };
      
      // Mock bookings for status counts
      const mockStatusQuery = {
        select: sinon.stub().returns({
          eq: sinon.stub().resolves({
            data: [
              { status: 'confirmed', count: 10 },
              { status: 'pending', count: 5 },
              { status: 'cancelled', count: 2 },
              { status: 'completed', count: 15 }
            ],
            error: null
          })
        })
      };
      
      // Configure the from stub to return different queries based on the table name
      mockSupabase.from.withArgs('users').returns(mockUsersQuery);
      mockSupabase.from.withArgs('rooms').returns(mockRoomsQuery);
      mockSupabase.from.withArgs('bookings').returns(mockBookingsQuery);
      mockSupabase.from.withArgs('bookings').onSecondCall().returns(mockRecentBookingsQuery);
      mockSupabase.from.withArgs('bookings').onThirdCall().returns(mockRevenueQuery);
      mockSupabase.from.withArgs('bookings').onCall(3).returns(mockStatusQuery);
      
      // Replace the supabaseClient with our mock
      Object.keys(mockSupabase).forEach(key => {
        supabaseClient[key] = mockSupabase[key];
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
      expect(response.dashboard.recentBookings).to.be.an('array');
      expect(response.dashboard.recentBookings.length).to.equal(2);
    });
    
    it('should handle database errors', async () => {
      // Create a mock that returns an error
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock users count with error
      const mockUsersQuery = {
        count: sinon.stub().resolves({ count: null, error: new Error('Database error') })
      };
      
      // Configure the from stub to return the error query
      mockSupabase.from.withArgs('users').returns(mockUsersQuery);
      
      // Replace the supabaseClient with our mock
      Object.keys(mockSupabase).forEach(key => {
        supabaseClient[key] = mockSupabase[key];
      });
      
      // Call the controller function
      await adminController.getDashboardStats(req, res, next);
      
      // Assertions
      expect(next.calledOnce).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
      expect(next.firstCall.args[0].message).to.equal('Database error');
    });
  });
  
  describe('getSystemHealth', () => {
    it('should return system health status', async () => {
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock database health check
      const mockHealthQuery = {
        select: sinon.stub().returns({
          limit: sinon.stub().resolves({
            data: [{ id: 'test' }],
            error: null
          })
        })
      };
      
      // Configure the from stub
      mockSupabase.from.withArgs('users').returns(mockHealthQuery);
      
      // Replace the supabaseClient with our mock
      Object.keys(mockSupabase).forEach(key => {
        supabaseClient[key] = mockSupabase[key];
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
      expect(response.health.database).to.exist;
      expect(response.health.database.status).to.equal('connected');
    });
    
    it('should handle database errors', async () => {
      // Create a mock that returns an error
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock database health check with error
      const mockHealthQuery = {
        select: sinon.stub().returns({
          limit: sinon.stub().resolves({
            data: null,
            error: new Error('Database connection error')
          })
        })
      };
      
      // Configure the from stub
      mockSupabase.from.withArgs('users').returns(mockHealthQuery);
      
      // Replace the supabaseClient with our mock
      Object.keys(mockSupabase).forEach(key => {
        supabaseClient[key] = mockSupabase[key];
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
      expect(response.health.database).to.exist;
      expect(response.health.database.status).to.equal('error');
    });
  });
});
