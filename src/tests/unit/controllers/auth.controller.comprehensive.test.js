/**
 * Comprehensive Unit Tests for Auth Controller
 * 
 * Tests the authentication controller functions with proper mocking of dependencies
 * focusing on the admin login functionality
 */

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const jwt = require('jsonwebtoken');

describe('Auth Controller', () => {
  let req, res, next;
  let authController;
  let supabaseStub;
  let bcryptStub;
  let jwtStub;
  let AppErrorStub;
  
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
      json: sinon.stub(),
      cookie: sinon.stub(),
      clearCookie: sinon.stub()
    };
    
    next = sinon.stub();
    
    // Create stubs for dependencies
    supabaseStub = {
      from: sinon.stub()
    };
    
    bcryptStub = {
      compare: sinon.stub(),
      genSalt: sinon.stub(),
      hash: sinon.stub()
    };
    
    jwtStub = {
      sign: sinon.stub(),
      verify: sinon.stub()
    };
    
    // Create a stub for AppError
    AppErrorStub = sinon.stub();
    
    // Create stubs for JWT utility functions
    const generateTokenStub = sinon.stub();
    const generateRefreshTokenStub = sinon.stub();
    const verifyTokenStub = sinon.stub();
    const refreshAccessTokenStub = sinon.stub();
    
    // Use proxyquire to replace the dependencies with our stubs
    authController = proxyquire('../../../controllers/auth.controller', {
      '../config/supabase': { supabaseClient: supabaseStub },
      'bcrypt': bcryptStub,
      '../utils/jwt': {
        generateToken: generateTokenStub,
        generateRefreshToken: generateRefreshTokenStub,
        verifyToken: verifyTokenStub,
        refreshAccessToken: refreshAccessTokenStub
      },
      '../utils/appError': AppErrorStub
    });
    
    // Configure the JWT utility stubs
    generateTokenStub.returns('mock-jwt-token');
    generateRefreshTokenStub.returns('mock-refresh-token');
  });
  
  afterEach(() => {
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
      
      // Create stubs for the Supabase query
      const singleStub = sinon.stub().resolves({
        data: adminUser,
        error: null
      });
      
      const eqStub = sinon.stub().returns({
        single: singleStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Configure bcrypt to return true (password matches)
      bcryptStub.compare.resolves(true);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(selectStub.calledWith('id, name, email, password, role, profile_pic')).to.be.true;
      expect(eqStub.calledWith('email', 'admin@example.com')).to.be.true;
      expect(singleStub.calledOnce).to.be.true;
      
      expect(bcryptStub.compare.calledWith('Admin@123456', 'hashed-password')).to.be.true;
      
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.cookie.calledWith('token')).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Admin login successful');
      expect(response.user).to.exist;
      expect(response.user.id).to.equal('admin-user-id');
      expect(response.user.role).to.equal('admin');
      expect(response.user.password).to.be.undefined; // Password should be removed from response
    });
    
    it('should return 401 when user is not found', async () => {
      // Create stubs for the Supabase query
      const singleStub = sinon.stub().resolves({
        data: null,
        error: null
      });
      
      const eqStub = sinon.stub().returns({
        single: singleStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(selectStub.calledWith('id, name, email, password, role, profile_pic')).to.be.true;
      expect(eqStub.calledWith('email', 'admin@example.com')).to.be.true;
      expect(singleStub.calledOnce).to.be.true;
      
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
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
      
      // Create stubs for the Supabase query
      const singleStub = sinon.stub().resolves({
        data: regularUser,
        error: null
      });
      
      const eqStub = sinon.stub().returns({
        single: singleStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(selectStub.calledWith('id, name, email, password, role, profile_pic')).to.be.true;
      expect(eqStub.calledWith('email', 'admin@example.com')).to.be.true;
      expect(singleStub.calledOnce).to.be.true;
      
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
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
      
      // Create stubs for the Supabase query
      const singleStub = sinon.stub().resolves({
        data: adminUser,
        error: null
      });
      
      const eqStub = sinon.stub().returns({
        single: singleStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Configure bcrypt to return false (password doesn't match)
      bcryptStub.compare.resolves(false);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(selectStub.calledWith('id, name, email, password, role, profile_pic')).to.be.true;
      expect(eqStub.calledWith('email', 'admin@example.com')).to.be.true;
      expect(singleStub.calledOnce).to.be.true;
      
      expect(bcryptStub.compare.calledWith('Admin@123456', 'hashed-password')).to.be.true;
      
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
    
    it('should handle database errors', async () => {
      // Create a database error
      const dbError = new Error('Database error');
      
      // Create stubs for the Supabase query
      const singleStub = sinon.stub().resolves({
        data: null,
        error: dbError
      });
      
      const eqStub = sinon.stub().returns({
        single: singleStub
      });
      
      const selectStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('users').returns({
        select: selectStub
      });
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(supabaseStub.from.calledWith('users')).to.be.true;
      expect(selectStub.calledWith('id, name, email, password, role, profile_pic')).to.be.true;
      expect(eqStub.calledWith('email', 'admin@example.com')).to.be.true;
      expect(singleStub.calledOnce).to.be.true;
      
      // The controller handles database errors by returning 401
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
  });
  
  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      // Set up request with refresh token
      req.cookies.refreshToken = 'test-refresh-token';
      
      // Create stubs for the Supabase query
      const eqStub = sinon.stub().resolves({
        error: null
      });
      
      const updateStub = sinon.stub().returns({
        eq: eqStub
      });
      
      // Configure the from stub
      supabaseStub.from.withArgs('refresh_tokens').returns({
        update: updateStub
      });
      
      // Call the controller function
      await authController.logout(req, res);
      
      // Assertions
      expect(res.clearCookie.calledWith('token')).to.be.true;
      expect(res.clearCookie.calledWith('refreshToken')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      // Check the response
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Logout successful');
    });
  });
});
