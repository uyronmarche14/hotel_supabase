/**
 * User Profile Management Controller
 * Handles user profile operations
 */

const { validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const { db } = require('../../db');
const { users } = require('../../db/schema');
const { eq, ne, and } = require('drizzle-orm');
const AppError = require('../../utils/appError');
const { uploadProfilePicture, deleteProfilePicture } = require('../../utils/storage/profileStorage');

/**
 * Get user profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const [user] = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        profilePic: users.profilePic,
        createdAt: users.createdAt
      })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Transform profile_pic to profilePic for frontend compatibility
    const userResponse = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      createdAt: user.createdAt
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
    const [currentUser] = await db
      .select({ profilePic: users.profilePic })
      .from(users)
      .where(eq(users.id, userId));

    // If email is being updated, check if it's already in use
    if (email) {
      const [existingUser] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, userId)));

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
        if (currentUser && currentUser.profilePic) {
          await deleteProfilePicture(currentUser.profilePic);
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

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (profilePicUrl !== undefined) updateData.profilePic = profilePicUrl;
    updateData.updatedAt = new Date();

    // Update user profile
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    
    // Transform response for frontend compatibility
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      profilePic: updatedUser.profilePic,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt
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
    const [user] = await db
      .select({ password: users.password })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) {
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
    await db
      .update(users)
      .set({
        password: hashedPassword,
        updatedAt: new Date()
      })
      .where(eq(users.id, userId));

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
