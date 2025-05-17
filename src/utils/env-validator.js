/**
 * Environment Variable Validator
 * 
 * This utility validates required environment variables and provides
 * default values for optional ones.
 */

// Required environment variables
const requiredEnvVars = [
  'SUPABASE_URL',
  'SUPABASE_ANON_KEY',
  'JWT_SECRET'
];

// Optional environment variables with default values
const optionalEnvVars = {
  'JWT_EXPIRES_IN': '24h',
  'REFRESH_TOKEN_EXPIRES_IN': '7d',
  'PORT': '10000',
  'NODE_ENV': 'development'
};

/**
 * Validate required environment variables
 * @returns {boolean} True if all required variables are set
 */
const validateEnv = () => {
  let isValid = true;
  const missing = [];

  // Check required environment variables
  requiredEnvVars.forEach(envVar => {
    if (!process.env[envVar]) {
      isValid = false;
      missing.push(envVar);
    }
  });

  // Set default values for optional environment variables
  Object.entries(optionalEnvVars).forEach(([key, defaultValue]) => {
    if (!process.env[key]) {
      process.env[key] = defaultValue;
      console.log(`Setting default value for ${key}: ${defaultValue}`);
    }
  });

  // Log missing required variables
  if (missing.length > 0) {
    console.error('Missing required environment variables:');
    missing.forEach(envVar => {
      console.error(`- ${envVar}`);
    });
    console.error('Please set these variables in your .env file');
  }

  return isValid;
};

/**
 * Get environment variable with fallback
 * @param {string} key - Environment variable key
 * @param {string} fallback - Fallback value if not set
 * @returns {string} Environment variable value or fallback
 */
const getEnv = (key, fallback = '') => {
  return process.env[key] || fallback;
};

module.exports = {
  validateEnv,
  getEnv
};
