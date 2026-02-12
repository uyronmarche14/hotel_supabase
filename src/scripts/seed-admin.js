require('dotenv').config();
const { db, client } = require('../db');
const { users } = require('../db/schema');
const bcrypt = require('bcrypt');
const { eq } = require('drizzle-orm');

async function seedAdmin() {
  try {
    console.log('Seeding admin user...');

    const adminEmail = 'admin@example.com';
    const adminPassword = 'adminpassword123';
    const adminName = 'Admin User';

    // Check if admin already exists
    const existingUser = await db.select().from(users).where(eq(users.email, adminEmail));
    
    if (existingUser.length > 0) {
      console.log('Admin user already exists.');
      return;
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);

    // Insert admin user
    const [newUser] = await db.insert(users).values({
      name: adminName,
      email: adminEmail,
      password: hashedPassword,
      role: 'admin',
      profilePic: '/images/default-user.png'
    }).returning();

    console.log('Admin user created successfully:');
    console.log(`Email: ${newUser.email}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Role: ${newUser.role}`);

  } catch (error) {
    console.error('Error seeding admin user:', error);
  } finally {
    await client.end();
  }
}

seedAdmin();
