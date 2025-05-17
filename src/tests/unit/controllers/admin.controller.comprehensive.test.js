/**
 * Comprehensive Unit Tests for Admin Controller
 * 
 * Tests the admin controller functions with proper mocking of dependencies
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Admin Controller', () => {
  let req, res, next;
  let adminController;
  let supabaseStub;
  let AppErrorStub;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      params: {},
      query: {},
      user: {
        id: 'admin-id',
        role: 'admin'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub(),
      cookie: sinon.stub()
    };
    
    next = sinon.stub();
    
    // Create stubs for dependencies
    supabaseStub = {
      from: sinon.stub()
    };
    
    // Create a stub for AppError
    AppErrorStub = sinon.stub().returns(new Error('App Error'));
    
    // Use proxyquire to replace the dependencies with our stubs
    adminController = proxyquire('../../../controllers/admin.controller', {
      '../config/supabase': { supabaseClient: supabaseStub },
      '../utils/appError': AppErrorStub
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('getDashboardStats', () => {
    it('should return dashboard statistics', async () => {
      // Mock data for various queries
      const usersCount = 10;
      const roomsCount = 20;
      const bookingsCount = 30;
      const recentBookings = [
        { id: 'booking-1', user_id: 'user-1', room_id: 'room-1', total_price: 200, status: 'confirmed' },
        { id: 'booking-2', user_id: 'user-2', room_id: 'room-2', total_price: 300, status: 'pending' }
      ];
      const revenueData = [
        { id: 'booking-1', total_price: 200, created_at: new Date().toISOString() },
        { id: 'booking-2', total_price: 300, created_at: new Date().toISOString() }
      ];
      const statusCounts = [
        { status: 'confirmed', count: 10 },
        { status: 'pending', count: 5 },
        { status: 'cancelled', count: 2 },
        { status: 'completed', count: 15 }
      ];
      
      // Create stubs for users count
      const usersCountStub = sinon.stub().resolves({
        count: usersCount,
        error: null
      });
      
      // Create stubs for rooms count
      const roomsCountStub = sinon.stub().resolves({
        count: roomsCount,
        error: null
      });
      
      // Create stubs for bookings count
      const bookingsCountStub = sinon.stub().resolves({
        count: bookingsCount,
        error: null
      });
      
      // Create stubs for recent bookings
      const limitStub = sinon.stub().resolves({
        data: recentBookings,
        error: null
      });
      
      const orderStub = sinon.stub().returns({
        limit: limitStub
      });
      
      const eqStub = sinon.stub().returns({
        order: orderStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Create stubs for revenue data
      const ltStub = sinon.stub().resolves({
        data: revenueData,
        error: null
      });
      
      const gteStub = sinon.stub().returns({
        lt: ltStub
      });
      
      const revenueSelectStub = sinon.stub().returns({
        gte: gteStub
      });
      
      // Create stubs for status counts
      const statusEqStub = sinon.stub().resolves({
        data: statusCounts,
        error: null
      });
      
      const statusSelectStub = sinon.stub().returns({
        eq: statusEqStub
      });
      
      // Configure the from stub to return different stubs based on the table name and call order
      // For users count
      const usersSelectStub = sinon.stub().returns({
        count: 'exact',
        head: true
      });
      usersSelectStub.resolves({
        count: usersCount,
        error: null
      });
      
      // For rooms count
      const roomsSelectStub = sinon.stub().returns({
        count: 'exact',
        head: true
      });
      roomsSelectStub.resolves({
        count: roomsCount,
        error: null
      });
      
      // For bookings count
      const bookingsSelectStub = sinon.stub().returns({
        count: 'exact',
        head: true
      });
      bookingsSelectStub.resolves({
        count: bookingsCount,
        error: null
      });
      
      // Configure the from stub for different tables
      supabaseStub.from.withArgs('users').onFirstCall().returns({
        select: usersSelectStub
      });
      
      supabaseStub.from.withArgs('rooms').returns({
        select: roomsSelectStub
      });
      
      // First call to bookings for count
      supabaseStub.from.withArgs('bookings').onFirstCall().returns({
        select: bookingsSelectStub
      });
      
      // Second call to bookings for recent bookings
      supabaseStub.from.withArgs('bookings').onSecondCall().returns({
        select: selectStub
      });
      
      // Third call to bookings for revenue data
      supabaseStub.from.withArgs('bookings').onThirdCall().returns({
        select: revenueSelectStub
      });
      
      // Fourth call to bookings for status counts
      supabaseStub.from.withArgs('bookings').onCall(3).returns({
        select: statusSelectStub
      });
      
      // Call the controller function
      await adminController.getDashboardStats(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(supabaseStub.from.calledWith('rooms')).to.be.true;
      expect(supabaseStub.from.calledWith('bookings')).to.be.true;
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.dashboard).to.exist;
      expect(response.dashboard.totalUsers).to.equal(usersCount);
      expect(response.dashboard.totalRooms).to.equal(roomsCount);
      expect(response.dashboard.totalBookings).to.equal(bookingsCount);
      expect(response.dashboard.recentBookings).to.deep.equal(recentBookings);
    });
    
    it('should handle database errors', async () => {
      // Create a database error
      const dbError = new Error('Database error');
      
      // Create stubs for users count with error
      const usersSelectStub = sinon.stub().returns({
        count: 'exact',
        head: true
      });
      usersSelectStub.resolves({
        count: null,
        error: dbError
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: usersSelectStub
      });
      
      // Call the controller function
      await adminController.getDashboardStats(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(AppErrorStub.called).to.be.true;
    });
  });
  
  describe('getSystemHealth', () => {
    it('should return system health status when database is healthy', async () => {
      // Create stubs for database health check
      const limitStub = sinon.stub().resolves({
        data: [{ id: 'test' }],
        error: null
      });
      
      const selectStub = sinon.stub().returns({
        limit: limitStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Call the controller function
      await adminController.getSystemHealth(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('healthy');
      expect(response.health.database).to.exist;
      expect(response.health.database.status).to.equal('connected');
    });
    
    it('should return degraded system health status when database has error', async () => {
      // Create stubs for database health check with error
      const limitStub = sinon.stub().resolves({
        data: null,
        error: new Error('Database connection error')
      });
      
      const selectStub = sinon.stub().returns({
        limit: limitStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Call the controller function
      await adminController.getSystemHealth(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('degraded');
      expect(response.health.database).to.exist;
      expect(response.health.database.status).to.equal('error');
    });
  });
  
  describe('getBookingsByStatus', () => {
    it('should return bookings filtered by status', async () => {
      // Mock bookings data
      const bookings = [
        { id: 'booking-1', user_id: 'user-1', room_id: 'room-1', status: 'confirmed' },
        { id: 'booking-2', user_id: 'user-2', room_id: 'room-2', status: 'confirmed' }
      ];
      
      // Set up request params
      req.params.status = 'confirmed';
      
      // Create stubs for the query
      const eqStub = sinon.stub().resolves({
        data: bookings,
        error: null
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('bookings').returns({
        select: selectStub
      });
      
      // Call the controller function
      await adminController.getBookingsByStatus(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('bookings')).to.be.true;
      expect(selectStub.called).to.be.true;
      expect(eqStub.calledWith('status', 'confirmed')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.bookings).to.deep.equal(bookings);
    });
    
    it('should handle database errors', async () => {
      // Set up request params
      req.params.status = 'confirmed';
      
      // Create a database error
      const dbError = new Error('Database error');
      
      // Create stubs for the query with error
      const eqStub = sinon.stub().resolves({
        data: null,
        error: dbError
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('bookings').returns({
        select: selectStub
      });
      
      // Call the controller function
      await adminController.getBookingsByStatus(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('bookings')).to.be.true;
      expect(next.calledOnce).to.be.true;
      expect(AppErrorStub.called).to.be.true;
    });
  });
});
