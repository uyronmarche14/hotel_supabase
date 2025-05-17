/**
 * Unit Tests for Auth Controller
 * 
 * Tests the authentication controller functions in isolation
 * with a focus on admin authentication functionality.
 */

const { expect } = require('chai');
const sinon = require('sinon');
const bcrypt = require('bcrypt');
const authController = require('../../../controllers/auth.controller');
const { supabaseClient } = require('../../../config/supabase');
const jwt = require('../../../utils/jwt');

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
    
    // Mock JWT utils
    sinon.stub(jwt, 'generateToken').returns('mock-jwt-token');
    sinon.stub(jwt, 'generateRefreshToken').resolves('mock-refresh-token');
    
    // Mock bcrypt
    sinon.stub(bcrypt, 'compare');
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
      
      // Mock Supabase response
      const selectStub = sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().resolves({
            data: adminUser,
            error: null
          })
        })
      });
      
      const fromStub = sinon.stub(supabaseClient, 'from').returns({
        select: selectStub
      });
      
      // Mock password comparison
      bcrypt.compare.resolves(true);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(fromStub.calledWith('users')).to.be.true;
      expect(res.status.calledWith(200)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      expect(res.cookie.calledWith('token')).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.true;
      expect(response.message).to.equal('Admin login successful');
      expect(response.user).to.exist;
      expect(response.user.role).to.equal('admin');
      expect(response.token).to.be.a('string');
    });
    
    it('should return 401 when user is not found', async () => {
      // Mock Supabase response for non-existent user
      const selectStub = sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().resolves({
            data: null,
            error: null
          })
        })
      });
      
      sinon.stub(supabaseClient, 'from').returns({
        select: selectStub
      });
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
    
    it('should return 401 when user is not an admin', async () => {
      // Mock regular user data
      const regularUser = {
        id: 'regular-user-id',
        name: 'Regular User',
        email: 'user@example.com',
        password: 'hashed-password',
        role: 'user',
        profile_pic: '/images/user.jpg'
      };
      
      // Mock Supabase response
      const selectStub = sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().resolves({
            data: regularUser,
            error: null
          })
        })
      });
      
      sinon.stub(supabaseClient, 'from').returns({
        select: selectStub
      });
      
      // Mock password comparison
      bcrypt.compare.resolves(true);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Admin login should return 403 for non-admin users
      expect(res.status.calledWith(403)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
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
      
      // Mock Supabase response
      const selectStub = sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().resolves({
            data: adminUser,
            error: null
          })
        })
      });
      
      sinon.stub(supabaseClient, 'from').returns({
        select: selectStub
      });
      
      // Mock password comparison (fails)
      bcrypt.compare.resolves(false);
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(res.status.calledWith(401)).to.be.true;
      expect(res.json.calledOnce).to.be.true;
      
      const response = res.json.firstCall.args[0];
      expect(response.success).to.be.false;
      expect(response.message).to.equal('Invalid credentials');
    });
    
    it('should handle database errors and pass to next middleware', async () => {
      // Mock database error
      const error = new Error('Database error');
      const selectStub = sinon.stub().returns({
        eq: sinon.stub().returns({
          single: sinon.stub().rejects(error)
        })
      });
      
      sinon.stub(supabaseClient, 'from').returns({
        select: selectStub
      });
      
      // Call the controller function
      await authController.adminLogin(req, res, next);
      
      // Assertions
      expect(next.called).to.be.true;
      expect(next.firstCall.args[0]).to.be.an('error');
    });
  });
  
  describe('logout', () => {
    it('should clear cookies and return success message', async () => {
      // Set up request with refresh token
      req.cookies.refreshToken = 'test-refresh-token';
      
      // Mock Supabase response for revoking refresh token
      const updateStub = sinon.stub().returns({
        eq: sinon.stub().resolves({
          error: null
        })
      });
      
      sinon.stub(supabaseClient, 'from').returns({
        update: updateStub
      });
      
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
