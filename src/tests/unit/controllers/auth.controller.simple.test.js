/**
 * Simplified Unit Tests for Auth Controller
 * 
 * Tests the authentication controller functions with simplified mocking
 * focusing on the admin login functionality
 */

const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authController = require('../../../controllers/auth.controller');
const { supabaseClient } = require('../../../config/supabase');

describe('Auth Controller', () => {
  let req, res, next;
  
  beforeEach(() => {
    // Mock request, response, and next function
    req = {
      body: {
        email: 'admin@example.com',
        password: 'Admin@123456'
      },
      cookies: {},
      headers: {}
    };
    
    res = {
      status: sinon.stub().returnsThis(),
      json: sinon.spy(),
      cookie: sinon.spy(),
      clearCookie: sinon.spy()
    };
    
    next = sinon.spy();
  });
  
  afterEach(() => {
    // Restore all stubs
    sinon.restore();
  });
  
  describe('adminLogin', () => {
    it('should authenticate admin user and return token with 200 status code', async () => {
      // Mock admin user data
      const adminUser = {
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'hashed-password',
        role: 'admin',
        profile_pic: '/images/admin.jpg'
      };
      
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the select query
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return the expected values
      singleStub.resolves({ data: adminUser, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      fromStub.returns({ select: selectStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Mock bcrypt.compare to return true
      sinon.stub(bcrypt, 'compare').resolves(true);
      
      // Mock JWT token generation
      sinon.stub(jwt, 'sign').returns('mock-jwt-token');
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.cookie.calledWith('token')).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Admin login successful');
      expect(response.user).to.exist;
      expect(response.user.role).to.equal('admin');
    });
    
    it('should return 401 when user is not found', async () => {
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the select query
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return null data (user not found)
      singleStub.resolves({ data: null, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      fromStub.returns({ select: selectStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
    
    it('should return 403 when user is not an admin', async () => {
      // Mock regular user data
      const regularUser = {
        id: 'regular-user-id',
        name: 'Regular User',
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'user',
        profile_pic: '/images/user.jpg'
      };
      
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the select query
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return the regular user
      singleStub.resolves({ data: regularUser, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      fromStub.returns({ select: selectStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Not authorized as admin');
    });
    
    it('should return 401 when password is incorrect', async () => {
      // Mock admin user data
      const adminUser = {
        id: 'admin-user-id',
        name: 'Admin User',
        email: 'admin@example.com',
        password: 'hashed-password',
        role: 'admin',
        profile_pic: '/images/admin.jpg'
      };
      
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the select query
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Configure the stubs to return the admin user
      singleStub.resolves({ data: adminUser, error: null });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      fromStub.returns({ select: selectStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Mock bcrypt.compare to return false (incorrect password)
      sinon.stub(bcrypt, 'compare').resolves(false);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
    
    it('should handle database errors', async () => {
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the select query
      const selectStub = sinon.stub();
      const eqStub = sinon.stub();
      const singleStub = sinon.stub();
      
      // Create a database error
      const dbError = new Error('Database error');
      
      // Configure the stubs to return an error
      singleStub.resolves({ data: null, error: dbError });
      eqStub.returns({ single: singleStub });
      selectStub.returns({ eq: eqStub });
      fromStub.returns({ select: selectStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions - The controller handles database errors by returning 401
      // since it checks for (error || !user) in a single condition
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
  });
  
  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      // Set up request with refresh token
      req.cookies.refreshToken = 'test-refresh-token';
      
      // Create a complete mock for supabaseClient.from
      const fromStub = sinon.stub();
      
      // Create a chain of stubs for the update query
      const updateStub = sinon.stub();
      const eqStub = sinon.stub();
      
      // Configure the stubs to return success
      eqStub.resolves({ error: null });
      updateStub.returns({ eq: eqStub });
      fromStub.returns({ update: updateStub });
      
      // Replace supabaseClient.from with our stub
      sinon.stub(supabaseClient, 'from').callsFake(fromStub);
      
      // Call the controller function
      await authController.logout(req, res);
      
      // Assertions
      expect(res.clearCookie.calledWith('token')).to.be.true;
      expect(res.clearCookie.calledWith('refreshToken')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Logout successful');
    });
  });
});
