/**
 * Focused Unit Test for Admin Controller - System Health
 * 
 * Tests the getSystemHealth function of the admin controller
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('Admin Controller - System Health', () => {
  let req, res, next;
  let adminController;
  let supabaseStub;
  let AppErrorStub;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      user: {
        id: 'admin-id',
        role: 'admin'
      }
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.stub()
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
  
  describe('getSystemHealth', () => {
    it('should return healthy status when database is connected', async () => {
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
      expect(selectStub.calledWith('id')).to.be.true;
      expect(limitStub.calledWith(1)).to.be.true;
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('healthy');
      expect(response.health.database.status).to.equal('healthy');
      expect(response.health.database.responseTime).to.exist;
      expect(response.health.server).to.exist;
    });
    
    it('should return unhealthy status when database has error', async () => {
      // Create stubs for database health check with error
      const dbError = new Error('Database connection error');
      
      const limitStub = sinon.stub().resolves({
        data: null,
        error: dbError
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
      expect(selectStub.calledWith('id')).to.be.true;
      expect(limitStub.calledWith(1)).to.be.true;
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.health).to.exist;
      expect(response.health.status).to.equal('unhealthy');
      expect(response.health.database.status).to.equal('error');
      expect(response.health.database.responseTime).to.exist;
      expect(response.health.server).to.exist;
    });
  });
});
