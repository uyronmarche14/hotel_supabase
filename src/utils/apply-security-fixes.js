/**
 * Apply Security Fixes Script
 * 
 * This script applies the security policy fixes directly to the Supabase database
 * using the Supabase REST API and the service role key.
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Get Supabase credentials from environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials. Please set SUPABASE_URL and SUPABASE_SERVICE_KEY in your .env file.');
  console.error('The SUPABASE_SERVICE_KEY is different from the SUPABASE_ANON_KEY and has admin privileges.');
  console.error('You can find it in your Supabase dashboard under Project Settings > API > service_role key');
  process.exit(1);
}

// Create Supabase admin client with service role key
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

/**
 * Apply security fixes
 */
async function applySecurityFixes() {
  console.log('🔒 Applying security fixes to Supabase database...');
  console.log('-----------------------------------');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-db-policies.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Split SQL into individual statements
    const sqlStatements = sqlContent
      .split(';')
      .map(statement => statement.trim())
      .filter(statement => statement.length > 0);

    console.log(`Found ${sqlStatements.length} SQL statements to execute`);

    // Execute each SQL statement
    for (let i = 0; i < sqlStatements.length; i++) {
      const statement = sqlStatements[i];
      console.log(`Executing statement ${i + 1}/${sqlStatements.length}...`);
      
      try {
        const { error } = await supabaseAdmin.rpc('exec_sql', { 
          query: statement + ';' 
        });
        
        if (error) {
          console.error(`❌ Error executing statement ${i + 1}: ${error.message}`);
          console.error(`Statement: ${statement}`);
        } else {
          console.log(`✅ Statement ${i + 1} executed successfully`);
        }
      } catch (statementError) {
        console.error(`❌ Exception executing statement ${i + 1}: ${statementError.message}`);
        console.error(`Statement: ${statement}`);
      }
    }

    console.log('-----------------------------------');
    console.log('✅ Security fixes applied successfully!');
    console.log('Run the verification test to confirm the changes:');
    console.log('node src/tests/verify-fixes.js');
  } catch (error) {
    console.error('❌ Failed to apply security fixes:', error.message);
    
    if (error.message.includes('ENOENT')) {
      console.error(`The SQL file was not found at: ${path.join(__dirname, 'fix-db-policies.sql')}`);
    }
  }
}

/**
 * Alternative method: Using direct SQL execution if RPC method fails
 */
async function applySecurityFixesAlternative() {
  console.log('🔒 Applying security fixes using alternative method...');
  console.log('-----------------------------------');

  try {
    // Read the SQL file
    const sqlFilePath = path.join(__dirname, 'fix-db-policies.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');

    // Execute the entire SQL script at once
    const { error } = await supabaseAdmin.from('_sql').select('*').execute(sqlContent);
    
    if (error) {
      console.error('❌ Error applying security fixes:', error.message);
      console.error('Try applying the fixes manually using the Supabase dashboard SQL editor.');
    } else {
      console.log('✅ Security fixes applied successfully!');
      console.log('Run the verification test to confirm the changes:');
      console.log('node src/tests/verify-fixes.js');
    }
  } catch (error) {
    console.error('❌ Failed to apply security fixes:', error.message);
    console.error('Try applying the fixes manually using the Supabase dashboard SQL editor.');
  }
}

// First try the primary method, and if it fails, try the alternative
applySecurityFixes().catch(error => {
  console.error('Primary method failed, trying alternative method...');
  applySecurityFixesAlternative().catch(error => {
    console.error('Both methods failed. Please apply the fixes manually using the Supabase dashboard SQL editor.');
  });
});
