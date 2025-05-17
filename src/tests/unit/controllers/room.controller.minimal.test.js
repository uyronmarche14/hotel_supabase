/**
 * Minimal Unit Test for Room Controller
 * 
 * Tests a single function of the room controller with proper mocking
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Room Controller - Minimal Test', () => {
  let req, res, next;
  let roomController;
  let supabaseStub;
  let AppErrorStub;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      params: {
        id: 'room-123'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
    };
    
    next = sinon.stub();
    
    // Create a stub for the Supabase client
    supabaseStub = {
      from: sinon.stub()
    };
    
    // Create a stub for AppError
    AppErrorStub = sinon.stub();
    
    // Use proxyquire to replace the dependencies with our stubs
    roomController = proxyquire('../../../controllers/room.controller', {
      '../config/supabase': { supabaseClient: supabaseStub },
      '../utils/appError': AppErrorStub
    });
  });
  
  afterEach(() => {
    sinon.restore();
  });
  
  describe('getRoomById', () => {
    it('should return a room when found', async () => {
      // Mock room data
      const mockRoom = {
        id: 'room-123',
        title: 'Test Room',
        description: 'A test room',
        price: 100,
        capacity: 2,
        size: 25,
        category: 'standard',
        location: 'Main Building',
        rating: 4.5,
        image_url: 'https://example.com/image.jpg',
        images: ['image1.jpg', 'image2.jpg']
      };
      
      // Mock reviews data
      const mockReviews = [
        { id: 'review-1', room_id: 'room-123', rating: 5, comment: 'Great room', user_id: 'user-1' },
        { id: 'review-2', room_id: 'room-123', rating: 4, comment: 'Nice room', user_id: 'user-2' }
      ];
      
      // Create stubs for the first query (get room)
      const roomSingleStub = sinon.stub().resolves({
        data: mockRoom,
        error: null
      });
      
      const roomEqStub = sinon.stub().returns({
        single: roomSingleStub
      });
      
      const roomSelectStub = sinon.stub().returns({
        eq: roomEqStub
      });
      
      // Create stubs for the second query (get reviews)
      const reviewsOrderStub = sinon.stub().resolves({
        data: mockReviews,
        error: null
      });
      
      const reviewsEqStub = sinon.stub().returns({
        order: reviewsOrderStub
      });
      
      const reviewsSelectStub = sinon.stub().returns({
        eq: reviewsEqStub
      });
      
      // Configure the from stub to return different stubs based on the table name
      supabaseStub.from.withArgs('rooms').returns({
        select: roomSelectStub
      });
      
      supabaseStub.from.withArgs('reviews').returns({
        select: reviewsSelectStub
      });
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('rooms')).to.be.true;
      expect(roomSelectStub.calledWith('*')).to.be.true;
      expect(roomEqStub.calledWith('id', 'room-123')).to.be.true;
      expect(roomSingleStub.calledOnce).to.be.true;
      
      expect(supabaseStub.from.calledWith('reviews')).to.be.true;
      expect(reviewsSelectStub.calledWith('*')).to.be.true;
      expect(reviewsEqStub.calledWith('room_id', 'room-123')).to.be.true;
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.room.id).to.equal('room-123');
      // Don't check the exact structure of reviews as it may be transformed by the controller
    });
    
    it('should return 404 when room is not found', async () => {
      // Create an AppError instance for the 404 error
      const notFoundError = new Error('Room not found');
      AppErrorStub.withArgs('Room not found', 404).returns(notFoundError);
      
      // Create stubs for the room query
      const roomSingleStub = sinon.stub().resolves({
        data: null,
        error: null
      });
      
      const roomEqStub = sinon.stub().returns({
        single: roomSingleStub
      });
      
      const roomSelectStub = sinon.stub().returns({
        eq: roomEqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('rooms').returns({
        select: roomSelectStub
      });
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('rooms')).to.be.true;
      expect(roomSelectStub.calledWith('*')).to.be.true;
      expect(roomEqStub.calledWith('id', 'room-123')).to.be.true;
      expect(roomSingleStub.calledOnce).to.be.true;
      
      expect(next.calledOnce).to.be.true;
      expect(next.calledWith(notFoundError)).to.be.true;
      expect(AppErrorStub.calledWith('Room not found', 404)).to.be.true;
    });
    
    it('should pass database errors to the next middleware', async () => {
      // Create a database error
      const dbError = new Error('Database error');
      
      // Create an AppError instance for the database error
      const appError = new Error('Database error');
      
      // Configure AppErrorStub to return the appError
      AppErrorStub.returns(appError);
      
      // Create stubs for the room query with error
      const roomSingleStub = sinon.stub().resolves({
        data: null,
        error: dbError
      });
      
      const roomEqStub = sinon.stub().returns({
        single: roomSingleStub
      });
      
      const roomSelectStub = sinon.stub().returns({
        eq: roomEqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('rooms').returns({
        select: roomSelectStub
      });
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('rooms')).to.be.true;
      expect(roomSelectStub.calledWith('*')).to.be.true;
      expect(roomEqStub.calledWith('id', 'room-123')).to.be.true;
      expect(roomSingleStub.calledOnce).to.be.true;
      
      // Check that next was called
      expect(next.called).to.be.true;
      
      // Check that AppError was called
      expect(AppErrorStub.called).to.be.true;
    });
  });
});
