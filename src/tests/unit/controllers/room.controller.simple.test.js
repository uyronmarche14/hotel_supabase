/**
 * Simplified Unit Tests for Room Controller
 * 
 * Tests the room controller functions with simplified mocking
 */

const { expect } = require('chai');
const sinon = require('sinon');
const roomController = require('../../../controllers/room.controller');
const { supabaseClient } = require('../../../config/supabase');
const { uploadRoomImage, uploadMultipleRoomImages } = require('../../../utils/storage/roomStorage');

describe('Room Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      params: {
        id: 'room-123'
      },
      query: {},
      body: {
        title: 'Test Room',
        description: 'A test room',
        price: 100,
        capacity: 2,
        category: 'standard',
        location: 'Main Building'
      },
      files: []
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    next = sinon.spy();
    
    // Stub the image upload functions
    sinon.stub(uploadRoomImage).returns(Promise.resolve('https://example.com/image.jpg'));
    sinon.stub(uploadMultipleRoomImages).returns(Promise.resolve(['https://example.com/image1.jpg', 'https://example.com/image2.jpg']));
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('getAllRooms', () => {
    it('should return all rooms with pagination', async () => {
      // Mock room data
      const rooms = [
        {
          id: 'room-1',
          title: 'Deluxe Room',
          description: 'A luxurious room',
          price: 200,
          category: 'deluxe',
          location: 'Main Building',
          capacity: 2,
          size: 30,
          image_url: '/images/room1.jpg',
          images: ['/images/room1-1.jpg', '/images/room1-2.jpg'],
          created_at: '2023-01-01T00:00:00Z',
          updated_at: '2023-01-01T00:00:00Z'
        },
        {
          id: 'room-2',
          title: 'Standard Room',
          description: 'A standard room',
          price: 100,
          category: 'standard',
          location: 'Annex Building',
          capacity: 2,
          size: 25,
          image_url: '/images/room2.jpg',
          images: ['/images/room2-1.jpg', '/images/room2-2.jpg'],
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock count query
      const countResult = { count: 2, error: null };
      const countQuery = { count: sinon.stub().resolves(countResult) };
      
      // Mock select query
      const rangeResult = { data: rooms, error: null };
      const rangeQuery = { range: sinon.stub().resolves(rangeResult) };
      const orderQuery = { order: sinon.stub().returns(rangeQuery) };
      const selectQuery = { select: sinon.stub().returns(orderQuery) };
      
      // Configure the from stub to return different queries based on call order
      mockSupabase.from.onFirstCall().returns(countQuery);
      mockSupabase.from.onSecondCall().returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.getAllRooms(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.rooms).to.be.an('array');
      expect(response.rooms.length).to.equal(2);
      expect(response.count).to.equal(2);
      expect(response.pagination).to.exist;
    });
  });
  
  describe('getRoomById', () => {
    it('should return a room by id', async () => {
      // Mock room data
      const room = {
        id: 'room-123',
        title: 'Test Room',
        description: 'A test room',
        price: 100,
        category: 'standard',
        location: 'Main Building',
        capacity: 2,
        size: 25,
        image_url: '/images/room.jpg',
        images: ['/images/room-1.jpg', '/images/room-2.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query
      const singleResult = { data: room, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Configure the from stub
      mockSupabase.from.returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.room.id).to.equal('room-123');
    });
    
    it('should return 404 when room is not found', async () => {
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query with null data
      const singleResult = { data: null, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Configure the from stub
      mockSupabase.from.returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
  });
  
  describe('createRoom', () => {
    it('should create a new room', async () => {
      // Mock new room data
      const newRoom = {
        id: 'new-room-123',
        title: 'Test Room',
        description: 'A test room',
        price: 100,
        category: 'standard',
        location: 'Main Building',
        capacity: 2,
        size: 25,
        image_url: 'https://example.com/image.jpg',
        images: ['https://example.com/image1.jpg', 'https://example.com/image2.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      // Add files to the request
      req.files = {
        image: {
          name: 'image.jpg',
          data: Buffer.from('test')
        },
        images: [
          {
            name: 'image1.jpg',
            data: Buffer.from('test1')
          },
          {
            name: 'image2.jpg',
            data: Buffer.from('test2')
          }
        ]
      };
      
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock insert query
      const insertResult = { data: [newRoom], error: null };
      const insertQuery = { insert: sinon.stub().resolves(insertResult) };
      
      // Configure the from stub
      mockSupabase.from.returns(insertQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.createRoom(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.room.id).to.equal('new-room-123');
    });
  });
  
  describe('updateRoom', () => {
    it('should update an existing room', async () => {
      // Mock updated room data
      const updatedRoom = {
        id: 'room-123',
        title: 'Updated Room',
        description: 'An updated room',
        price: 150,
        category: 'deluxe',
        location: 'Main Building',
        capacity: 3,
        size: 30,
        image_url: 'https://example.com/updated-image.jpg',
        images: ['https://example.com/updated-image1.jpg', 'https://example.com/updated-image2.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      
      // Update request body
      req.body = {
        title: 'Updated Room',
        description: 'An updated room',
        price: 150,
        category: 'deluxe',
        capacity: 3,
        size: 30
      };
      
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query for checking if room exists
      const existingRoom = { id: 'room-123', title: 'Test Room' };
      const singleResult = { data: existingRoom, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Mock update query
      const updateResult = { data: [updatedRoom], error: null };
      const updateEqQuery = { eq: sinon.stub().resolves(updateResult) };
      const updateQuery = { update: sinon.stub().returns(updateEqQuery) };
      
      // Configure the from stub for different calls
      mockSupabase.from.onFirstCall().returns(selectQuery);
      mockSupabase.from.onSecondCall().returns(updateQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.updateRoom(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.room.id).to.equal('room-123');
      expect(response.room.title).to.equal('Updated Room');
    });
    
    it('should return 404 when room to update is not found', async () => {
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query with null data
      const singleResult = { data: null, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Configure the from stub
      mockSupabase.from.returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.updateRoom(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
  });
  
  describe('deleteRoom', () => {
    it('should delete an existing room', async () => {
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query for checking if room exists
      const existingRoom = { id: 'room-123', title: 'Test Room' };
      const singleResult = { data: existingRoom, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Mock delete query
      const deleteResult = { data: null, error: null };
      const deleteEqQuery = { eq: sinon.stub().resolves(deleteResult) };
      const deleteQuery = { delete: sinon.stub().returns(deleteEqQuery) };
      
      // Configure the from stub for different calls
      mockSupabase.from.onFirstCall().returns(selectQuery);
      mockSupabase.from.onSecondCall().returns(deleteQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.deleteRoom(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Room deleted successfully');
    });
    
    it('should return 404 when room to delete is not found', async () => {
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query with null data
      const singleResult = { data: null, error: null };
      const singleQuery = { single: sinon.stub().resolves(singleResult) };
      const eqQuery = { eq: sinon.stub().returns(singleQuery) };
      const selectQuery = { select: sinon.stub().returns(eqQuery) };
      
      // Configure the from stub
      mockSupabase.from.returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.deleteRoom(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
  });
  
  describe('getRoomCategories', () => {
    it('should return all room categories', async () => {
      // Mock categories data
      const categories = [
        { category: 'standard-room', count: 5 },
        { category: 'deluxe-room', count: 3 },
        { category: 'suite', count: 2 }
      ];
      
      // Create a mock for supabaseClient
      const mockSupabase = {
        from: sinon.stub()
      };
      
      // Mock select query
      const selectResult = { data: categories, error: null };
      const selectQuery = { select: sinon.stub().resolves(selectResult) };
      
      // Configure the from stub
      mockSupabase.from.returns(selectQuery);
      
      // Replace the supabaseClient with our mock
      sinon.stub(supabaseClient, 'from').callsFake(mockSupabase.from);
      
      // Call the controller function
      await roomController.getRoomCategories(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.categories).to.be.an('array');
      expect(response.categories.length).to.equal(3);
    });
  });
});
