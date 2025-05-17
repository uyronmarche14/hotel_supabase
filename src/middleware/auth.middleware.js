const jwt = require('jsonwebtoken');
const { verifyToken, refreshAccessToken } = require('../utils/jwt');
const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');
const { getEnv } = require('../utils/env-validator');

// Get JWT configuration
const JWT_SECRET = getEnv('JWT_SECRET', 'your-secret-key');

/**
 * Middleware to verify JWT token and attach user to request
 */
exports.verifyToken = async (req, res, next) => {
  try {
    // Get token from authorization header or cookie
    let token;
    
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      // Get token from cookie
      token = req.cookies.token;
    }

    // Check if token exists
    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = verifyToken(token);
    if (!decoded) {
      return next(new AppError('Invalid token', 401));
    }

    // Check if user exists
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic')
      .eq('id', decoded.id)
      .single();

    if (error || !user) {
      return next(new AppError('User not found', 401));
    }

    // Add user to request object
    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profile_pic
    };

    next();
  } catch (error) {
    return next(new AppError('Not authorized to access this route', 401));
  }
};

/**
 * Middleware to restrict access to specific roles
 * @param {...string} roles - Roles allowed to access the route
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    // Check if user role is in the allowed roles
    if (!roles.includes(req.user.role)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }
    next();
  };
};

/**
 * Middleware to restrict access to admin users only
 */
exports.isAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return next(
      new AppError('Admin access required for this resource', 403)
    );
  }
  next();
};

/**
 * Middleware to refresh token if it's about to expire
 */
exports.refreshTokenIfNeeded = async (req, res, next) => {
  try {
    // Get token from authorization header or cookie
    let token;
    
    if (
      req.headers.authorization && 
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return next();
    }

    // Verify token without throwing an error
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if token is about to expire (less than 1 hour left)
      const tokenExp = decoded.exp * 1000; // Convert to milliseconds
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;
      
      if (tokenExp - now < oneHour) {
        // Token is about to expire, refresh it
        const refreshToken = req.cookies.refreshToken;
        
        if (refreshToken) {
          try {
            // Attempt to refresh the token
            const { accessToken, refreshToken: newRefreshToken } = await refreshAccessToken(refreshToken);
            
            // Set new tokens in cookies
            res.cookie('token', accessToken, {
              httpOnly: true,
              maxAge: 24 * 60 * 60 * 1000, // 1 day
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict'
            });
            
            res.cookie('refreshToken', newRefreshToken, {
              httpOnly: true,
              maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'strict'
            });
          } catch (refreshError) {
            console.error('Error refreshing token:', refreshError.message);
            // Continue with the current token
          }
        }
      }
    } catch (error) {
      // Ignore token verification errors here
      // The verifyToken middleware will handle them
    }
    
    next();
  } catch (error) {
    next();
  }
};
