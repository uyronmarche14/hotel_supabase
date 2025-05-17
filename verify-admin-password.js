/**
 * Admin Password Verification Script
 * 
 * This script verifies if the test admin password matches the stored hash
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const { supabaseClient } = require('./src/config/supabase');

// Test admin credentials from the test file
const adminUser = {
  email: 'admin@example.com',
  password: 'Admin@123456' // Password from test file
};

// Additional test passwords to try
const testPasswords = [
  'admin',
  'Admin@123456',
  'admin123',
  'Admin123',
  'password',
  'admin@123'
];

async function verifyAdminPassword() {
  try {
    console.log('🔍 Checking admin user in database...');
    
    // Fetch admin user from database
    const { data: user, error } = await supabaseClient
      .from('users')
      .select('id, name, email, password, role')
      .eq('email', adminUser.email)
      .single();
    
    if (error || !user) {
      console.error('❌ Admin user not found:', error);
      return;
    }
    
    console.log('✅ Admin user found:', {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    });
    
    console.log('🔐 Stored password hash:', user.password);
    
    // Check the password from test file
    console.log('\n🔍 Testing password from test file...');
    const isMatchTestFile = await bcrypt.compare(adminUser.password, user.password);
    console.log(`Password "${adminUser.password}" matches: ${isMatchTestFile}`);
    
    // Try additional test passwords
    console.log('\n🔍 Testing common/alternative admin passwords...');
    for (const testPassword of testPasswords) {
      const isMatch = await bcrypt.compare(testPassword, user.password);
      console.log(`Password "${testPassword}" matches: ${isMatch}`);
    }
    
    // Generate a new hash for Admin@123456 for comparison
    console.log('\n🔍 Generating fresh hash for "Admin@123456"...');
    const freshHash = await bcrypt.hash('Admin@123456', 10);
    console.log('Fresh hash:', freshHash);
    
    console.log('\n✨ If none of the passwords match, you may need to:');
    console.log('1. Update the admin password in the database');
    console.log('2. Create a new admin user');
    console.log('3. Check if bcrypt salt rounds/algorithm matches what was used during user creation');
    
  } catch (error) {
    console.error('❌ Error verifying admin password:', error);
  } finally {
    process.exit(0);
  }
}

verifyAdminPassword();
