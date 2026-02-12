/**
 * Admin User Management Controller
 * Handles admin operations for user management
 */

const { db } = require('../../db');
const { users } = require('../../db/schema');
const { eq, ne, and } = require('drizzle-orm');
const AppError = require('../../utils/appError');

/**
 * Get all users (admin only)
 */
const getAllUsers = async (req, res, next) => {
  try {
    const usersData = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        profilePic: users.profilePic,
        createdAt: users.createdAt
      })
      .from(users);

    // Transform data for frontend compatibility
    const usersResponse = usersData.map(user => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      profilePic: user.profilePic,
      createdAt: user.createdAt
    }));

    res.status(200).json({
      success: true,
      count: usersData.length,
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
      .where(eq(users.id, id));

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Transform data for frontend compatibility
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
 * Update user (admin only)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, role, profilePic } = req.body;

    // Check if user exists
    const [existingUser] = await db.select().from(users).where(eq(users.id, id));

    if (!existingUser) {
      return next(new AppError('User not found', 404));
    }

    // If email is being updated, check if it's already in use
    if (email) {
      const [duplicateEmail] = await db
        .select()
        .from(users)
        .where(and(eq(users.email, email), ne(users.id, id)));

      if (duplicateEmail) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (email !== undefined) updateData.email = email;
    if (role !== undefined) updateData.role = role;
    if (profilePic !== undefined) updateData.profilePic = profilePic;
    updateData.updatedAt = new Date();

    // Update user
    const [updatedUser] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
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
    const [existingUser] = await db.select().from(users).where(eq(users.id, id));

    if (!existingUser) {
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
    await db.delete(users).where(eq(users.id, id));



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
