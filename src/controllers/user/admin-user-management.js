/**
 * Admin User Management Controller
 * Handles admin operations for user management
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const { data: users, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic, created_at');

    if (error) {
      return next(new AppError(error.message, 500));
    }

    // Transform data for frontend compatibility
    const usersResponse = users.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profile_pic,
      createdAt: user.created_at
    }));

    res.status(200).json({
      success: true,
      count: users.length,
      users: usersResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Get user by ID (admin only)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic, created_at')
      .eq('id', id)
      .single();

    if (error || !user) {
      return next(new AppError('User not found', 404));
    }

    // Transform data for frontend compatibility
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
 * Update user (admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, profilePic } = req.body;

    // Check if user exists
    const { data: existingUser, error: findError } = await supabaseClient
      .from('users')
      .select('id')
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return next(new AppError('User not found', 404));
    }

    // If email is being updated, check if it's already in use
    if (email) {
      const { data: duplicateEmail } = await supabaseClient
        .from('users')
        .select('id')
        .eq('email', email)
        .neq('id', id)
        .single();

      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Update user
    const { data: updatedUser, error } = await supabaseClient
      .from('users')
      .update({
        name,
        email,
        role,
        profile_pic: profilePic,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
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
      message: 'User updated successfully',
      user: userResponse
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

/**
 * Delete user (admin only)
 */
const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const { data: existingUser, error: findError } = await supabaseClient
      .from('users')
      .select('id, role')
      .eq('id', id)
      .single();

    if (findError || !existingUser) {
      return next(new AppError('User not found', 404));
    }

    // Prevent deleting admin users
    if (existingUser.role === 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot delete admin users'
      });
    }

    // Delete user
    const { error } = await supabaseClient
      .from('users')
      .delete()
      .eq('id', id);

    if (error) {
      return next(new AppError(error.message, 500));
    }

    res.status(200).json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    next(new AppError(error.message, 500));
  }
};

module.exports = {
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
};
