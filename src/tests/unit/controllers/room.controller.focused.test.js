/**
 * Focused Unit Tests for Room Controller
 * 
 * Tests the room controller with proper mocking of dependencies
 */

const { expect } = require('chai');
const sinon = require('sinon');
const roomController = require('../../../controllers/room.controller');
const { supabaseClient } = require('../../../config/supabase');
const roomStorage = require('../../../utils/storage/roomStorage');
const AppError = require('../../../utils/appError');

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
      files: {}
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
      cookie: sinon.spy()
    };
    
    next = sinon.spy();
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
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
        image_url: 'https://example.com/image.jpg',
        images: ['https://example.com/image1.jpg'],
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z'
      };
      
      // Create a stub for supabaseClient.from
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a select stub that returns a chainable object
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return the expected values
      singleStub.resolves({ data: room, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      
      // Configure the from stub to return the select stub
      fromStub.withArgs('rooms').returns({ select: selectStub });
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(selectStub.calledWith('*')).to.be.true;
      expect(eqStub.calledWith('id', 'room-123')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.room).to.exist;
    });
    
    it('should return 404 when room is not found', async () => {
      // Create a stub for supabaseClient.from
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a select stub that returns a chainable object
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return null data (room not found)
      singleStub.resolves({ data: null, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      
      // Configure the from stub to return the select stub
      fromStub.withArgs('rooms').returns({ select: selectStub });
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(selectStub.calledWith('*')).to.be.true;
      expect(eqStub.calledWith('id', 'room-123')).to.be.true;
      expect(res.status.calledWith(404)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Room not found');
    });
    
    it('should handle database errors', async () => {
      // Create a stub for supabaseClient.from
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create a select stub that returns a chainable object
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return an error
      const dbError = new Error('Database error');
      singleStub.resolves({ data: null, error: dbError });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      
      // Configure the from stub to return the select stub
      fromStub.withArgs('rooms').returns({ select: selectStub });
      
      // Stub the AppError constructor
      sinon.stub(AppError.prototype, 'constructor').returns(new Error('Database error'));
      
      // Call the controller function
      await roomController.getRoomById(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(next.called).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
    });
  });
  
  describe('deleteRoom', () => {
    it('should delete an existing room', async () => {
      // Mock existing room data
      const existingRoom = {
        id: 'room-123',
        title: 'Test Room',
        images: []
      };
      
      // Create a stub for supabaseClient.from
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create stubs for the first query (check if room exists)
      const selectStub = sinon.stub();
      const selectEqStub = sinon.stub();
      const selectSingleStub = sinon.stub();
      
      // Configure the stubs for the first query
      selectSingleStub.resolves({ data: existingRoom, error: null });
      selectEqStub.returns({ single: selectSingleStub });
      selectStub.returns({ eq: selectEqStub });
      
      // Create stubs for the second query (delete room)
      const deleteStub = sinon.stub();
      const deleteEqStub = sinon.stub();
      
      // Configure the stubs for the second query
      deleteEqStub.resolves({ data: null, error: null });
      deleteStub.returns({ eq: deleteEqStub });
      
      // Configure the from stub to return different stubs based on call order
      const roomsStub = sinon.stub();
      roomsStub.onFirstCall().returns({ select: selectStub });
      roomsStub.onSecondCall().returns({ delete: deleteStub });
      
      fromStub.withArgs('rooms').returns(roomsStub());
      
      // Stub the image deletion function
      sinon.stub(roomStorage, 'deleteRoomImage').resolves();
      
      // Call the controller function
      await roomController.deleteRoom(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('rooms')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Room deleted successfully');
    });
    
    it('should return 404 when room to delete is not found', async () => {
      // Create a stub for supabaseClient.from
      const fromStub = sinon.stub(supabaseClient, 'from');
      
      // Create stubs for the query
      const selectStub = sinon.stub();
      const selectEqStub = sinon.stub();
      const selectSingleStub = sinon.stub();
      
      // Configure the stubs to return null data (room not found)
      selectSingleStub.resolves({ data: null, error: null });
      selectEqStub.returns({ single: selectSingleStub });
      selectStub.returns({ eq: selectEqStub });
      
      // Configure the from stub
      fromStub.withArgs('rooms').returns({ select: selectStub });
      
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
});
