require('dotenv').config();
const { db, client } = require('../db');
const { sql } = require('drizzle-orm');

async function testConnection() {
  try {
    console.log('Testing Drizzle ORM connection...');
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('Connection successful!', result);
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await client.end();
  }
}

testConnection();
