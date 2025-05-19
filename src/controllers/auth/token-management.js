/**
 * Auth Token Management Controller
 * Handles token refresh and logout
 */

const { supabaseClient } = require('../../config/supabase');
const AppError = require('../../utils/appError');
const { refreshAccessToken } = require('../../utils/jwt');

/**
 * Refresh token
 */
const refreshToken = async (req, res, next) => {
  try {
    // Get the refresh token from cookie
    const refreshToken = req.cookies.refreshToken || req.body.refreshToken;
    
    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'No refresh token provided'
      });
    }
    
    // Check if token exists and is not revoked
    const { data: tokenData, error: tokenError } = await supabaseClient
      .from('refresh_tokens')
      .select('user_id, is_revoked')
      .eq('token', refreshToken)
      .single();
    
    if (tokenError || !tokenData) {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }
    
    if (tokenData.is_revoked) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token has been revoked'
      });
    }
    
    // Get user data
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, name, email, role, profile_pic')
      .eq('id', tokenData.user_id)
      .single();
    
    if (userError || !userData) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Generate new access token
    const newAccessToken = refreshAccessToken(userData.id, userData.role);
    
    // Set new token in cookie
    res.cookie('token', newAccessToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });
    
    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully',
      token: newAccessToken,
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
 * Logout user
 */
const logout = (req, res) => {
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

module.exports = {
  refreshToken,
  logout
};
