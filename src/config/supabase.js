const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

// Validate that required environment variables are set
if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables. Please check your .env file.');
  process.exit(1);
}

// Create Supabase client
const supabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

/**
 * Get authenticated Supabase client with JWT
 * @param {string} jwt - JWT token for authentication
 * @returns {Object} Authenticated Supabase client
 */
const getAuthenticatedClient = (jwt) => {
  if (!jwt) return supabaseClient;
  
  // Create a new client with the JWT set
  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    },
    global: {
      headers: {
        Authorization: `Bearer ${jwt}`
      }
    }
  });
  
  return authClient;
};

module.exports = { 
  supabaseClient,
  getAuthenticatedClient
};
