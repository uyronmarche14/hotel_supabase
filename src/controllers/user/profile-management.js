/**
 * User Profile Management Controller
 * Handles user profile operations
 */

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { uploadProfilePicture, deleteProfilePicture } = require('../../utils/storage/profileStorage');

/**
 * Get user profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return next(new AppError('User not found', 404));
    }

    // Transform profile_pic to profilePic for frontend compatibility
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profile_pic,
      createdAt: user.created_at
    };

    res.status(200).json({
      success: true,
      user: userResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Update user profile
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
    
    // Get current user data to check for existing profile pic
    const { data: currentUser } = await supabaseClient
      .from('users')
      .select('profile_pic')
      .eq('id', userId)
      .single();

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
    
    // Handle profile picture upload if file is provided in the request
    let profilePicUrl = profilePic;
    if (req.file) {
      try {
        // Delete old profile picture if exists
        if (currentUser && currentUser.profile_pic) {
          await deleteProfilePicture(currentUser.profile_pic);
        }
        
        // Upload new profile picture
        profilePicUrl = await uploadProfilePicture(
          userId,
          req.file.buffer,
          req.file.originalname,
          req.file.mimetype
        );
      } catch (uploadError) {
        console.error('Profile picture upload error:', uploadError);
        // Continue with profile update even if image upload fails
      }
    }

    // Update user profile
    const { data: updatedUser, error } = await supabaseClient
      .from('users')
      .update({
        name,
        email,
        profile_pic: profilePicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select('id, name, email, role, profile_pic, created_at, updated_at')
      .single();

    if (error) {
      return next(new AppError(error.message, 500));
    }
    
    // Transform response for frontend compatibility
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePic: updatedUser.profile_pic,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at
    };

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: userResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
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
    const { currentPassword, newPassword } = req.body;

    // Get user from database
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('password')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return next(new AppError('User not found', 404));
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update password
    const { error: updateError } = await supabaseClient
      .from('users')
      .update({
        password: hashedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (updateError) {
      return next(new AppError(updateError.message, 500));
    }

    res.status(200).json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  changePassword
};
