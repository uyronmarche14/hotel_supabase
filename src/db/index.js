require('dotenv').config();
const { drizzle } = require('drizzle-orm/postgres-js');
const postgres = require('postgres');
const schema = require('./schema');

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

// Disable prefetch as it is not supported for "Transaction" pool mode
const client = postgres(connectionString, { 
  prepare: false,
  max: 10, // Max number of connections
  idle_timeout: 20, // Idle connection timeout in seconds
  connect_timeout: 10 // Connect timeout in seconds
});
const db = drizzle(client, { schema });

module.exports = { db, client };
