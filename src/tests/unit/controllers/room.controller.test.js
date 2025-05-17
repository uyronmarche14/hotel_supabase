/**
 * Unit Tests for Room Controller
 * 
 * Tests the room controller functions in isolation
 * with a focus on room management functionality.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const roomController = require('../../../controllers/room.controller');
const { supabaseClient } = require('../../../config/supabase');

describe('Room Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      body: {
        title: 'Test Room',
        description: 'A test room description',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard'
      },
      params: {
        id: 'test-room-id'
      },
      query: {
        page: 1,
        limit: 10
      },
      user: {
        id: 'test-user-id',
        role: 'admin'
      },
      files: []
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy()
    };
    
    next = sinon.spy();
    
    // We'll mock the Supabase client in each test case
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
          type: 'deluxe',
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
          type: 'standard',
          image_url: '/images/room2.jpg',
          images: ['/images/room2-1.jpg', '/images/room2-2.jpg'],
          created_at: '2023-01-02T00:00:00Z',
          updated_at: '2023-01-02T00:00:00Z'
        }
      ];
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // First call - for the count query
      const countChain = {};
      countChain.count = sinon.stub().returns({
        eq: sinon.stub().resolves({
          count: 2,
          error: null
        })
      });
      
      // Second call - for the select query
      const selectChain = {};
      selectChain.select = sinon.stub().returns({
        order: sinon.stub().returns({
          range: sinon.stub().resolves({
            data: rooms,
            error: null
          })
        })
      });
      
      // Configure the fromStub to return different chains on different calls
      fromStub.onFirstCall().returns(countChain);
      fromStub.onSecondCall().returns(selectChain);
      
      // Call the controller function
      await roomController.getAllRooms(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.count).to.equal(2);
      expect(response.rooms).to.be.an('array');
      expect(response.rooms).to.have.lengthOf(2);
      expect(response.pagination).to.exist;
      expect(response.pagination.currentPage).to.equal(1);
      expect(response.pagination.totalPages).to.equal(1);
    });
    
    it('should handle database errors', async () => {
      // Mock database error
      const error = new Error('Database error');
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object that returns an error
      const selectChain = {};
      selectChain.select = sinon.stub().returns({
        order: sinon.stub().returns({
          range: sinon.stub().resolves({
            data: null,
            error: error
          })
        })
      });
      
      // Make from return the select chain
      fromStub.returns(selectChain);
      
      // Call the controller function
      await roomController.getAllRooms(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(next.called).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
    });
  });
  
  describe('getRoomById', () => {
    it('should return a room by id', async () => {
      // Mock room data
      const room = {
        id: 'test-room-id',
        title: 'Test Room',
        description: 'A test room description',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard',
        image_url: '/images/test-room.jpg',
        images: ['/images/test-room-1.jpg', '/images/test-room-2.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a select method that returns itself for chaining
      const selectStub = { eq: sinon.stub() };
      selectStub.select = sinon.stub().returns(selectStub);
      
      // Create an eq method that returns a single method
      selectStub.eq.returns({ single: sinon.stub().resolves({ data: room, error: null }) });
      
      // Make from return the select stub
      fromStub.returns(selectStub);
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.room.id).to.equal('test-room-id');
    });
    
    it('should return 404 when room is not found', async () => {
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a select method that returns itself for chaining
      const selectStub = { eq: sinon.stub() };
      selectStub.select = sinon.stub().returns(selectStub);
      
      // Create an eq method that returns a single method with null data
      selectStub.eq.returns({ single: sinon.stub().resolves({ data: null, error: null }) });
      
      // Make from return the select stub
      fromStub.returns(selectStub);
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
  });
  
  describe('createRoom', () => {
    it('should create a new room', async () => {
      // Mock room data
      const newRoom = {
        id: 'new-room-id',
        title: 'Test Room',
        description: 'A test room description',
        price: 150,
        category: 'standard-room',
        location: 'Test Location',
        capacity: 2,
        type: 'standard',
        image_url: null,
        images: [],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create an insert method that returns a select method
      const selectStub = sinon.stub().resolves({ data: [newRoom], error: null });
      const insertStub = { select: selectStub };
      insertStub.insert = sinon.stub().returns(insertStub);
      
      // Make from return the insert stub
      fromStub.returns(insertStub);
      
      // Mock validation result to pass validation
      const validationResultStub = sinon.stub().returns({
        isEmpty: () => true
      });
      
      // Replace the original require with our mock
      const originalValidationResult = require('express-validator').validationResult;
      require('express-validator').validationResult = validationResultStub;
      
      // Call the controller function
      await roomController.createRoom(req, res, next);
      
      // Restore the original function
      require('express-validator').validationResult = originalValidationResult;
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(201)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.message).to.equal('Room created successfully');
    });
    
    it('should handle validation errors', async () => {
      // Create a validation error handler mock
      const validationResultStub = sinon.stub().returns({
        isEmpty: () => false,
        array: () => [{ param: 'title', msg: 'Title is required' }]
      });
      
      // Replace the original require with our mock
      const originalValidationResult = require('express-validator').validationResult;
      require('express-validator').validationResult = validationResultStub;
      
      // Missing required fields
      req.body = {
        title: '',
        price: 'not-a-number'
      };
      
      // Call the controller function
      await roomController.createRoom(req, res, next);
      
      // Restore the original function
      require('express-validator').validationResult = originalValidationResult;
      
      // Assertions
      expect(res.status.calledWith(400)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.include('validation');
    });
  });
  
  describe('updateRoom', () => {
    it('should update an existing room', async () => {
      // Mock room data
      const updatedRoom = {
        id: 'test-room-id',
        title: 'Updated Room',
        description: 'An updated room description',
        price: 200,
        category: 'deluxe-room',
        location: 'Updated Location',
        capacity: 3,
        type: 'deluxe',
        image_url: '/images/test-room.jpg',
        images: ['/images/test-room-1.jpg', '/images/test-room-2.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-02T00:00:00Z'
      };
      
      // Set update data in request body
      req.body = {
        title: 'Updated Room',
        description: 'An updated room description',
        price: 200,
        category: 'deluxe-room',
        location: 'Updated Location',
        capacity: 3,
        type: 'deluxe'
      };
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the first call (select)
      const selectChain = {};
      selectChain.select = sinon.stub().returns(selectChain);
      selectChain.eq = sinon.stub().returns({
        single: sinon.stub().resolves({
          data: { ...updatedRoom, ...req.body },
          error: null
        })
      });
      
      // Create a chainable object for the second call (update)
      const updateChain = {};
      updateChain.update = sinon.stub().returns(updateChain);
      updateChain.eq = sinon.stub().returns({
        select: sinon.stub().resolves({
          data: [updatedRoom],
          error: null
        })
      });
      
      // Configure the fromStub to return different chains on different calls
      fromStub.onFirstCall().returns(selectChain);
      fromStub.onSecondCall().returns(updateChain);
      
      // Call the controller function
      await roomController.updateRoom(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
      expect(response.message).to.equal('Room updated successfully');
    });
    
    it('should return 404 when room to update is not found', async () => {
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the select call
      const selectChain = {};
      selectChain.select = sinon.stub().returns(selectChain);
      selectChain.eq = sinon.stub().returns({
        single: sinon.stub().resolves({
          data: null,
          error: null
        })
      });
      
      // Make from return the select chain
      fromStub.returns(selectChain);
      
      // Call the controller function
      await roomController.updateRoom(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
  });
  
  describe('deleteRoom', () => {
    it('should delete an existing room', async () => {
      // Mock room data
      const room = {
        id: 'test-room-id',
        title: 'Test Room'
      };
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the first call (select)
      const selectChain = {};
      selectChain.select = sinon.stub().returns(selectChain);
      selectChain.eq = sinon.stub().returns({
        single: sinon.stub().resolves({
          data: room,
          error: null
        })
      });
      
      // Create a chainable object for the second call (delete)
      const deleteChain = {};
      deleteChain.delete = sinon.stub().returns(deleteChain);
      deleteChain.eq = sinon.stub().resolves({
        data: null,
        error: null
      });
      
      // Configure the fromStub to return different chains on different calls
      fromStub.onFirstCall().returns(selectChain);
      fromStub.onSecondCall().returns(deleteChain);
      
      // Call the controller function
      await roomController.deleteRoom(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.include('deleted');
    });
    
    it('should return 404 when room to delete is not found', async () => {
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the select call
      const selectChain = {};
      selectChain.select = sinon.stub().returns(selectChain);
      selectChain.eq = sinon.stub().returns({
        single: sinon.stub().resolves({
          data: null,
          error: null
        })
      });
      
      // Make from return the select chain
      fromStub.returns(selectChain);
      
      // Call the controller function
      await roomController.deleteRoom(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
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
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the select call
      const selectChain = {};
      // Make the select function return a promise that resolves with the categories data
      selectChain.select = sinon.stub().resolves({
        data: categories,
        error: null
      });
      
      // Make from return the select chain
      fromStub.returns(selectChain);
      
      // Call the controller function
      await roomController.getRoomCategories(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.categories).to.be.an('array');
      expect(response.categories).to.have.lengthOf(3);
    });
    
    it('should handle database errors', async () => {
      // Mock database error
      const error = new Error('Database error');
      
      // Mock the from method
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a chainable object for the select call
      const selectChain = {};
      // Make the select function return a promise that resolves with an error
      selectChain.select = sinon.stub().resolves({
        data: null,
        error: error
      });
      
      // Make from return the select chain
      fromStub.returns(selectChain);
      
      // Call the controller function
      await roomController.getRoomCategories(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(next.called).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
    });
  });
});
