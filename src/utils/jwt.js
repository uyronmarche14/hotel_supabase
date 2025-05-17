const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { supabaseClient } = require('../config/supabase');
const { getEnv } = require('./env-validator');

// Get JWT configuration from environment variables
const JWT_SECRET = getEnv('JWT_SECRET', 'your-secret-key');
const JWT_EXPIRES_IN = getEnv('JWT_EXPIRES_IN', '24h');

/**
 * Generate JWT token
 * @param {string|object} userIdOrPayload - User ID or payload object
 * @param {string} [role] - User role (optional if userIdOrPayload is an object)
 * @returns {string} JWT token
 */
const generateToken = (userIdOrPayload, role) => {
  let payload;
  
  // Handle both object and separate parameters
  if (typeof userIdOrPayload === 'object') {
    payload = userIdOrPayload;
  } else {
    payload = { id: userIdOrPayload, role };
  }
  
  return jwt.sign(
    payload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

/**
 * Generate refresh token and store in database
 * @param {string} userId - User ID
 * @returns {string} Refresh token
 */
const generateRefreshToken = async (userId) => {
  try {
    const token = uuidv4();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now
    
    // Store refresh token in Supabase
    const { error } = await supabaseClient
      .from('refresh_tokens')
      .insert({
        user_id: userId,
        token,
        expires_at: expiresAt.toISOString(),
        is_revoked: false
      });
      
    if (error) {
      console.error('Failed to generate refresh token:', error);
      throw new Error('Failed to generate refresh token');
    }
    
    return token;
  } catch (error) {
    console.error('Error generating refresh token:', error);
    throw error;
  }
};

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object|null} Decoded token or null if invalid
 */
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    console.error('Token verification failed:', error.message);
    return null;
  }
};

/**
 * Refresh access token using refresh token
 * @param {string} refreshToken - Refresh token
 * @returns {object} New access token and refresh token
 */
const refreshAccessToken = async (refreshToken) => {
  try {
    // Check if refresh token exists and is valid
    const { data: tokenData, error } = await supabaseClient
      .from('refresh_tokens')
      .select('user_id, expires_at, is_revoked')
      .eq('token', refreshToken)
      .single();
    
    if (error || !tokenData) {
      throw new Error('Invalid refresh token');
    }
    
    // Check if token is expired or revoked
    if (new Date(tokenData.expires_at) < new Date() || tokenData.is_revoked) {
      throw new Error('Refresh token expired or revoked');
    }
    
    // Get user data
    const { data: userData, error: userError } = await supabaseClient
      .from('users')
      .select('id, role')
      .eq('id', tokenData.user_id)
      .single();
    
    if (userError || !userData) {
      throw new Error('User not found');
    }
    
    // Generate new access token
    const newAccessToken = generateToken(userData.id, userData.role);
    
    // Generate new refresh token
    const newRefreshToken = await generateRefreshToken(userData.id);
    
    // Revoke old refresh token
    await supabaseClient
      .from('refresh_tokens')
      .update({ is_revoked: true })
      .eq('token', refreshToken);
    
    return {
      accessToken: newAccessToken,
      refreshToken: newRefreshToken
    };
  } catch (error) {
    console.error('Error refreshing token:', error);
    throw error;
  }
};

module.exports = {
  generateToken,
  generateRefreshToken,
  verifyToken,
  refreshAccessToken
};
