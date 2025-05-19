/**
 * Auth Profile Management Controller
 * Handles current user profile operations
 */

const { validationResult } = require('express-validator');
const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get current user
 */
const getCurrentUser = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return next(new AppError('User not found', 404));
    }

    res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        profilePic: user.profile_pic
      }
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Update user profile - matching the old backend structure
 */
const updateUserProfile = async (req, res, next) => {
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

    const userId = req.user.id;
    const { name, email, profilePic } = req.body;

    // If email is being updated, check if it's already in use
    if (email) {
      const { data: existingUser } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', userId)
        .single();

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Update user profile
    const { data: updatedUser, error } = await supabaseClient
      .from('users')
      .update({
        name,
        email,
        profile_pic: profilePic,
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

module.exports = {
  getCurrentUser,
  updateUserProfile
};
