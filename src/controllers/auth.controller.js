const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { supabaseClient } = require('../config/supabase');
const AppError = require('../utils/appError');
const { generateToken, generateRefreshToken, verifyToken, refreshAccessToken } = require('../utils/jwt');

/**
 * Register a new user
 */
exports.register = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name, email, password } = req.body;

    // Check if user already exists
    const { data: existingUser } = await supabaseClient
      .from('users')
      .select('email')
      .eq('email', email)
      .single();

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user in Supabase
    const { data: newUser, error } = await supabaseClient
      .from('users')
      .insert([
        {
          name,
          email,
          password: hashedPassword,
          role: 'user'
        }
      ])
      .select('id, name, email, role')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Login user
 */
exports.login = async (req, res, next) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Get user from Supabase
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, password, role, profile_pic')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is an admin for regular login
    if (user.role === 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Please use admin login'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Set token in cookie for enhanced security
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        role: userWithoutPassword.role,
        profilePic: user.profile_pic
      },
      token
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Admin login
 */
exports.adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Get user from Supabase
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, password, role, profile_pic')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is an admin
    if (user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized as admin'
      });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const token = generateToken(user.id, user.role);

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Set token in cookie for enhanced security
    res.cookie('token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Admin login successful',
      user: {
        id: userWithoutPassword.id,
        name: userWithoutPassword.name,
        email: userWithoutPassword.email,
        role: userWithoutPassword.role,
        profilePic: user.profile_pic
      },
      token
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get current user
 */
exports.getCurrentUser = async (req, res, next) => {
  try {
    // User is already available from the protect middleware
    const { id, name, email, role, profilePic } = req.user;

    res.status(200).json({
      success: true,
      user: {
        id,
        name,
        email,
        role,
        profilePic
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Update user profile - matching the old backend structure
 */
exports.updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, email, profilePic } = req.body;

    // Validate email if provided
    if (email) {
      // Check if email is already taken by another user
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }

    // Update user in Supabase
    const { data: updatedUser, error } = await supabaseClient
      .from('users')
      .update({
        name: name || undefined,
        email: email || undefined,
        profile_pic: profilePic || undefined,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, role, profile_pic')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        profilePic: updatedUser.profile_pic
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Refresh token
 */
exports.refreshToken = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }
    
    // Refresh the access token
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
    
    // Get user information to include in response
    const decoded = verifyToken(accessToken);
    if (!decoded || !decoded.id) {
      throw new Error('Invalid token generated');
    }
    
    const { data: userData, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic')
      .eq('id', decoded.id)
      .single();
      
    if (error || !userData) {
      throw new Error('User not found');
    }
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: accessToken,
      user: {
        id: userData.id,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        profilePic: userData.profile_pic
      }
    });
  } catch (error) {
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.status(401).json({
      success: false,
      message: error.message || 'Invalid refresh token'
    });
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    // Check if user exists
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Generate reset token
    const resetToken = generateToken(user.id, 'reset');

    // Store reset token in database
    await supabaseClient
      .from('password_resets')
      .upsert([
        {
          user_id: user.id,
          token: resetToken,
          expires_at: new Date(Date.now() + 3600000).toISOString() // 1 hour
        }
      ]);

    // In a real app, send email with reset link
    // For now, just return the token in the response
    res.status(200).json({
      success: true,
      message: 'Password reset instructions sent to email',
      resetToken // Remove this in production
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      return res.status(400).json({
        success: false,
        message: 'Token and password are required'
      });
    }

    // Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
      if (!decoded || decoded.role !== 'reset') {
        throw new Error('Invalid token');
      }
    } catch (error) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if token exists in database
    const { data: resetRecord, error } = await supabaseClient
      .from('password_resets')
      .select('user_id, expires_at')
      .eq('token', token)
      .single();

    if (error || !resetRecord) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Check if token is expired
    if (new Date(resetRecord.expires_at) < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Token has expired'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update user password
    await supabaseClient
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', resetRecord.user_id);

    // Delete used token
    await supabaseClient
      .from('password_resets')
      .delete()
      .eq('token', token);

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Logout user
 */
exports.logout = (req, res) => {
  try {
    // Get refresh token from cookie
    const refreshToken = req.cookies.refreshToken;
    
    // If refresh token exists, revoke it
    if (refreshToken) {
      supabaseClient
        .from('refresh_tokens')
        .update({ is_revoked: true })
        .eq('token', refreshToken)
        .then(() => {
          console.log('Refresh token revoked');
        })
        .catch(error => {
          console.error('Error revoking refresh token:', error);
        });
    }
    
    // Clear cookies
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout'
    });
  }
};
