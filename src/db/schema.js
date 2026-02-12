const { pgTable, uuid, text, numeric, integer, boolean, timestamp, date, uniqueIndex, index } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Users Table
const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  profilePic: text('profile_pic').default('/images/default-user.png'),
  role: text('role').default('user'), // user, admin
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Hotels Table
const hotels = pgTable('hotels', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull(),
  address: text('address').notNull(),
  city: text('city').notNull(),
  state: text('state').notNull(),
  zipCode: text('zip_code').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  website: text('website'),
  rating: numeric('rating'), // check constraint > 1 < 5
  roomsCount: integer('rooms_count').notNull(),
  price: numeric('price').notNull(),
  photo: text('photo').default('no-photo.jpg'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// Rooms Table
const rooms = pgTable('rooms', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  roomNumber: text('room_number').unique(),
  type: text('type').default('standard'), // standard, deluxe, suite, executive, family
  description: text('description'),
  fullDescription: text('full_description'),
  price: numeric('price').notNull(),
  imageUrl: text('image_url').default('/images/room-placeholder.jpg'),
  images: text('images').array().default([]), // Postgres array
  location: text('location').default('Taguig, Metro Manila'),
  category: text('category').notNull(), // standard-room, deluxe-room, etc.
  rating: numeric('rating').default('4.5'),
  reviews: integer('reviews').default(0),
  capacity: integer('capacity').default(1),
  maxOccupancy: integer('max_occupancy').default(2),
  bedType: text('bed_type').default('Queen'),
  roomSize: text('room_size').default('30 sq m'),
  viewType: text('view_type').default('City view'),
  amenities: text('amenities').array().default([]),
  additionalAmenities: text('additional_amenities').array().default(["WiFi", "Air conditioning", "Daily housekeeping", "Mini bar"]),
  features: text('features').array().default([]),
  isAvailable: boolean('is_available').default(true),
  href: text('href'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    searchIdx: index('rooms_search_idx').using('gin', sql`to_tsvector('english', ${table.title} || ' ' || COALESCE(${table.description}, '') || ' ' || COALESCE(${table.fullDescription}, '') || ' ' || ${table.category})`),
  };
});

// Bookings Table
const bookings = pgTable('bookings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  bookingId: text('booking_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  email: text('email').notNull(),
  phone: text('phone').notNull(),
  roomId: uuid('room_id').references(() => rooms.id, { onDelete: 'set null' }),
  roomType: text('room_type').notNull(),
  roomTitle: text('room_title').notNull(),
  roomCategory: text('room_category').notNull(),
  roomImage: text('room_image'),
  checkIn: date('check_in').notNull(),
  checkOut: date('check_out').notNull(),
  nights: integer('nights').notNull(),
  guests: integer('guests').notNull(),
  specialRequests: text('special_requests'),
  basePrice: numeric('base_price').notNull(),
  taxAndFees: numeric('tax_and_fees').notNull(),
  totalPrice: numeric('total_price').notNull(),
  status: text('status').default('pending'), // pending, confirmed, cancelled, completed
  paymentStatus: text('payment_status').default('pending'), // pending, paid, refunded
  location: text('location'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
  return {
    roomStatusIdx: index('bookings_room_status_idx').on(table.roomTitle, table.roomCategory, table.status),
    datesIdx: index('bookings_dates_idx').on(table.checkIn, table.checkOut),
  };
});

// Refresh Tokens Table
const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  isRevoked: boolean('is_revoked').default(false),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => {
    return {
        expiresIdx: index('refresh_tokens_expires_idx').on(table.expiresAt)
    }
});

// Password Resets Table
const passwordResets = pgTable('password_resets', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => {
    return {
        resetExpiresIdx: index('password_resets_expires_idx').on(table.expiresAt)
    }
});

module.exports = {
  users,
  hotels,
  rooms,
  bookings,
  refreshTokens,
  passwordResets,
};
