/**
 * Auth Registration and Login Controller
 * Handles user registration, login, and admin login functions
 */

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { generateToken } = require('../../utils/jwt');

/**
 * Register a new user
 */
const register = async (req, res, next) => {
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
const login = async (req, res, next) => {
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
const adminLogin = async (req, res, next) => {
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

    // Check if user has admin role
    if (user.role !== 'admin') {
      return res.status(401).json({
        success: false,
        message: 'Unauthorized access'
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

module.exports = {
  register,
  login,
  adminLogin
};
