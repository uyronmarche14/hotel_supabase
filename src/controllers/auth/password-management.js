/**
 * Auth Password Management Controller
 * Handles password reset functionality
 */

const bcrypt = require('bcrypt');
const { validationResult } = require('express-validator');
const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { generateToken, verifyToken } = require('../../utils/jwt');

/**
 * Forgot password
 */
const forgotPassword = async (req, res, next) => {
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
const resetPassword = async (req, res, next) => {
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
  forgotPassword,
  resetPassword,
  changePassword
};
