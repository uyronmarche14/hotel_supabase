/**
 * Database Seed Script
 * Creates admin user, regular users, rooms with real images, and bookings.
 * 
 * Uses its OWN dedicated DB connection (not the shared pool from db/index.js)
 * so it can run safely whether or not the backend server is running.
 * 
 * Usage: node src/db/seed.js
 */

require('dotenv').config();
const bcrypt = require('bcrypt');
const postgres = require('postgres');
const { drizzle } = require('drizzle-orm/postgres-js');
const schema = require('./schema');

// ── Config ─────────────────────────────────────────
const SEED_COUNTS = { USERS: 15, ROOMS: 8, BOOKINGS: 40 };

// ── Helpers ────────────────────────────────────────
const rand = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const fmtDate = (d) => d.toISOString().split('T')[0];

// ── Data ───────────────────────────────────────────
const ROOM_TITLES = [
  'Ocean Breeze Suite', 'Metropolitan Deluxe King', 'Garden View Standard',
  'Skyline Executive Suite', 'Family Paradise Room', 'Royal Penthouse Suite',
  'Cozy Standard Twin', 'Premium Deluxe Queen'
];
const ROOM_DESCS = [
  'A serene retreat with panoramic views and modern amenities for the discerning traveler.',
  'Spacious and elegantly designed room featuring premium furnishings and a luxurious king-size bed.',
  'Comfortable and well-appointed room perfect for both business and leisure stays.',
  'An exclusive suite with a separate living area, work desk, and stunning city skyline views.',
  'Generously sized room with interconnected spaces, ideal for families with children.',
  'The pinnacle of luxury — a sprawling suite with butler service and private terrace.',
  'A cozy and inviting room with twin beds, perfect for friends traveling together.',
  'Upgraded comfort with a plush queen bed, rain shower, and curated minibar.'
];
const IMAGES = [
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1590490360182-f33d5e6a385c?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560662105-57f8ad6ae2d1?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=800&q=80',
  'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80'
];
const TYPES = ['standard', 'deluxe', 'suite', 'executive', 'family'];
const CATS = ['standard-room', 'deluxe-room', 'suite-room', 'executive-room', 'family-room'];
const LOCS = ['Taguig, Metro Manila', 'Makati, Metro Manila', 'Pasay, Metro Manila', 'Quezon City, Metro Manila'];
const AMENITIES = ['WiFi', 'Air conditioning', 'Daily housekeeping', 'Mini bar', 'TV', 'Safe', 'City View', 'Balcony', 'Pool access', 'Gym access'];
const FIRSTS = ['James', 'Maria', 'Carlos', 'Yuki', 'Sarah', 'Mohammed', 'Elena', 'David', 'Sofia', 'Liam', 'Aisha', 'Henrik', 'Priya', 'Lucas', 'Mei'];
const LASTS = ['Santos', 'Garcia', 'Kim', 'Tanaka', 'Mueller', 'Reyes', 'Park', 'Singh', 'Chen', 'Williams', 'Cruz', 'Andersen', 'Lopez', 'Nakamura', 'Brown'];

// ── Main ───────────────────────────────────────────
const main = async () => {
  console.log('🌱 Starting database seed...\n');

  // Create a DEDICATED connection (not the shared server pool)
  const sql = postgres(process.env.DATABASE_URL, {
    prepare: false,
    max: 3,
    connect_timeout: 10,
    idle_timeout: 5
  });
  const db = drizzle(sql, { schema });

  try {
    // ── Clean ──────────────────────────────────────
    console.log('🧹 Cleaning...');
    await db.delete(schema.bookings);
    await db.delete(schema.refreshTokens);
    await db.delete(schema.rooms);
    await db.delete(schema.users);
    console.log('   ✔ Tables cleared\n');

    // ── Admin ──────────────────────────────────────
    console.log('👤 Creating admin...');
    const adminHash = await bcrypt.hash('admin123', 10);
    const [admin] = await db.insert(schema.users).values({
      name: 'Admin User',
      email: 'admin@admin.com',
      password: adminHash,
      role: 'admin',
      profilePic: '/images/default-user.png'
    }).returning();
    console.log('   ✔ admin@admin.com / admin123\n');

    // ── Users ──────────────────────────────────────
    console.log(`👥 Creating ${SEED_COUNTS.USERS} users...`);
    const userHash = await bcrypt.hash('password123', 10);
    const usersData = FIRSTS.slice(0, SEED_COUNTS.USERS).map((f, i) => {
      const l = LASTS[i % LASTS.length];
      return {
        name: `${f} ${l}`,
        email: `${f.toLowerCase()}.${l.toLowerCase()}@example.com`,
        password: userHash,
        role: 'user',
        profilePic: `https://i.pravatar.cc/150?u=${f}${l}`
      };
    });
    const createdUsers = await db.insert(schema.users).values(usersData).returning();
    console.log(`   ✔ ${createdUsers.length} users\n`);

    // ── Rooms ──────────────────────────────────────
    console.log(`🏨 Creating ${SEED_COUNTS.ROOMS} rooms...`);
    const roomsData = ROOM_TITLES.slice(0, SEED_COUNTS.ROOMS).map((title, i) => {
      const ti = i % TYPES.length;
      return {
        title,
        roomNumber: `${(i + 1) * 100 + rand(1, 9)}`,
        type: TYPES[ti],
        description: ROOM_DESCS[i],
        fullDescription: `${ROOM_DESCS[i]} Enjoy complimentary breakfast, 24-hour room service, and access to our world-class spa and fitness center.`,
        price: (rand(80, 500) * 100).toString(),
        imageUrl: IMAGES[i % IMAGES.length],
        images: [IMAGES[(i + 1) % IMAGES.length], IMAGES[(i + 2) % IMAGES.length], IMAGES[(i + 3) % IMAGES.length]],
        location: pick(LOCS),
        category: CATS[ti],
        rating: (rand(35, 50) / 10).toString(),
        reviews: rand(5, 200),
        capacity: rand(1, 3),
        maxOccupancy: rand(2, 6),
        amenities: AMENITIES.slice(0, rand(4, AMENITIES.length)),
        isAvailable: true
      };
    });
    const createdRooms = await db.insert(schema.rooms).values(roomsData).returning();
    console.log(`   ✔ ${createdRooms.length} rooms\n`);

    // ── Bookings ───────────────────────────────────
    console.log(`📅 Creating ${SEED_COUNTS.BOOKINGS} bookings...`);
    const allUsers = [admin, ...createdUsers];
    const bookingsData = [];

    for (let i = 0; i < SEED_COUNTS.BOOKINGS; i++) {
      const u = pick(allUsers);
      const r = pick(createdRooms);
      const ci = new Date(2025, rand(0, 11), rand(1, 28));
      const n = rand(1, 7);
      const co = new Date(ci);
      co.setDate(ci.getDate() + n);
      const p = parseFloat(r.price);
      const tax = Math.round(p * n * 0.12);

      bookingsData.push({
        bookingId: `BK-${String(i).padStart(3, '0')}-${Date.now()}`,
        userId: u.id,
        firstName: u.name.split(' ')[0],
        lastName: u.name.split(' ').slice(1).join(' ') || 'Guest',
        email: u.email,
        phone: `+63-9${rand(10, 99)}-${rand(100, 999)}-${rand(1000, 9999)}`,
        roomId: r.id,
        roomType: r.type,
        roomTitle: r.title,
        roomCategory: r.category,
        roomImage: r.imageUrl,
        checkIn: fmtDate(ci),
        checkOut: fmtDate(co),
        nights: n,
        guests: rand(1, r.maxOccupancy || 2),
        specialRequests: pick(['', '', '', 'Late check-out', 'Extra pillows', 'Airport transfer']),
        basePrice: (p * n).toString(),
        taxAndFees: tax.toString(),
        totalPrice: (p * n + tax).toString(),
        status: pick(['confirmed', 'pending', 'cancelled', 'completed', 'completed', 'completed']),
        paymentStatus: pick(['paid', 'paid', 'paid', 'pending']),
        location: r.location
      });
    }

    const CHUNK = 20;
    for (let i = 0; i < bookingsData.length; i += CHUNK) {
      await db.insert(schema.bookings).values(bookingsData.slice(i, i + CHUNK));
    }
    console.log(`   ✔ ${bookingsData.length} bookings\n`);

    console.log('═══════════════════════════════════════');
    console.log('  🎉  Seed completed successfully!');
    console.log('═══════════════════════════════════════');
    console.log(`  Admin:    admin@admin.com / admin123`);
    console.log(`  Users:    ${SEED_COUNTS.USERS} (password123)`);
    console.log(`  Rooms:    ${SEED_COUNTS.ROOMS}`);
    console.log(`  Bookings: ${SEED_COUNTS.BOOKINGS}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Seed FAILED:', error.message);
    console.error(error);
  } finally {
    await sql.end();
    process.exit(0);
  }
};

main();
