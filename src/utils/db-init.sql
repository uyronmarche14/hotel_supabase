-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================
-- USERS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  profile_pic TEXT DEFAULT '/images/default-user.png',
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================
-- HOTELS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS hotels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  zip_code TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  rating NUMERIC CHECK (rating >= 1 AND rating <= 5),
  rooms_count INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  photo TEXT DEFAULT 'no-photo.jpg',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================
-- ROOMS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS rooms (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL CHECK (char_length(title) <= 100),
  room_number TEXT UNIQUE,
  type TEXT DEFAULT 'standard' CHECK (type IN ('standard', 'deluxe', 'suite', 'executive', 'family')),
  description TEXT CHECK (char_length(description) <= 500),
  full_description TEXT,
  price NUMERIC NOT NULL CHECK (price >= 0),
  image_url TEXT DEFAULT '/images/room-placeholder.jpg',
  images TEXT[] DEFAULT '{}',
  location TEXT DEFAULT 'Taguig, Metro Manila',
  category TEXT NOT NULL CHECK (category IN (
    'standard-room', 'deluxe-room', 'executive-suite', 
    'presidential-suite', 'honeymoon-suite', 'family-room')),
  rating NUMERIC DEFAULT 4.5 CHECK (rating >= 1 AND rating <= 5),
  reviews INTEGER DEFAULT 0 CHECK (reviews >= 0),
  capacity INTEGER DEFAULT 1 CHECK (capacity >= 1),
  max_occupancy INTEGER DEFAULT 2 CHECK (max_occupancy >= 1),
  bed_type TEXT DEFAULT 'Queen' CHECK (bed_type IN ('Single', 'Double', 'Queen', 'King', 'Twin', 'Various')),
  room_size TEXT DEFAULT '30 sq m',
  view_type TEXT DEFAULT 'City view',
  amenities TEXT[] DEFAULT '{}',
  additional_amenities TEXT[] DEFAULT '{"WiFi", "Air conditioning", "Daily housekeeping", "Mini bar"}',
  features TEXT[] DEFAULT '{}',
  is_available BOOLEAN DEFAULT TRUE,
  href TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger: Auto-generate href from category/title
CREATE OR REPLACE FUNCTION generate_room_href()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.href IS NULL THEN
    NEW.href := '/hotelRoomDetails/' || NEW.category || '/' || 
                REPLACE(LOWER(NEW.title), ' ', '-');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_room_href
BEFORE INSERT OR UPDATE ON rooms
FOR EACH ROW
EXECUTE FUNCTION generate_room_href();

-- Full-text index for rooms
CREATE INDEX IF NOT EXISTS rooms_search_idx ON rooms 
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(full_description, '') || ' ' || category));

-- ============================
-- BOOKINGS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  booking_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  room_type TEXT NOT NULL,
  room_title TEXT NOT NULL,
  room_category TEXT NOT NULL,
  room_image TEXT,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  nights INTEGER NOT NULL,
  guests INTEGER NOT NULL,
  special_requests TEXT,
  base_price NUMERIC NOT NULL,
  tax_and_fees NUMERIC NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  location TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Booking indexes
CREATE INDEX IF NOT EXISTS bookings_room_status_idx ON bookings(room_title, room_category, status);
CREATE INDEX IF NOT EXISTS bookings_dates_idx ON bookings(check_in, check_out);

-- ============================
-- REFRESH TOKENS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_revoked BOOLEAN DEFAULT FALSE,
  user_agent TEXT,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS refresh_tokens_expires_idx ON refresh_tokens(expires_at);

-- ============================
-- PASSWORD RESETS TABLE
-- ============================
CREATE TABLE IF NOT EXISTS password_resets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS password_resets_expires_idx ON password_resets(expires_at);

-- ============================
-- UTILITY FUNCTIONS
-- ============================

-- Top-rated room by category
CREATE OR REPLACE FUNCTION get_top_rooms_by_category()
RETURNS SETOF rooms
LANGUAGE SQL
AS $$
  WITH ranked_rooms AS (
    SELECT 
      *,
      ROW_NUMBER() OVER (PARTITION BY category ORDER BY rating DESC) AS rank
    FROM rooms
  )
  SELECT id, title, room_number, type, description, full_description, price, image_url,
         images, location, category, rating, reviews, capacity, max_occupancy, bed_type,
         room_size, view_type, amenities, additional_amenities, features, is_available,
         href, created_at, updated_at
  FROM ranked_rooms 
  WHERE rank = 1;
$$;


-- Room availability checker
CREATE OR REPLACE FUNCTION check_room_availability(
  room_id UUID,
  check_in_date DATE,
  check_out_date DATE
) RETURNS BOOLEAN
LANGUAGE plpgsql
AS $$
DECLARE
  is_available BOOLEAN;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM rooms WHERE id = room_id AND is_available = TRUE) THEN
    RETURN FALSE;
  END IF;

  SELECT NOT EXISTS (
    SELECT 1 FROM bookings 
    WHERE room_id = check_room_availability.room_id
    AND status != 'cancelled'
    AND (
      (check_in <= check_out_date AND check_out >= check_in_date)
    )
  ) INTO is_available;

  RETURN is_available;
END;
$$;

-- ============================
-- ROW LEVEL SECURITY (RLS)
-- ============================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE refresh_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- USERS policy
CREATE POLICY users_policy ON users
  USING (role = 'admin' OR id = auth.uid());

-- BOOKINGS policy
CREATE POLICY bookings_policy ON bookings
  USING (auth.role() = 'admin' OR user_id = auth.uid());

-- REFRESH TOKENS policy
CREATE POLICY refresh_tokens_policy ON refresh_tokens
  USING (auth.role() = 'admin' OR user_id = auth.uid());

-- PASSWORD RESETS policy
CREATE POLICY password_resets_policy ON password_resets
  USING (auth.role() = 'admin' OR user_id = auth.uid());

-- ROOMS policy (anyone can read, only admin can write)
CREATE POLICY rooms_read_policy ON rooms
  FOR SELECT USING (TRUE);

CREATE POLICY rooms_write_policy ON rooms
  FOR INSERT WITH CHECK (auth.role() = 'admin');

CREATE POLICY rooms_update_policy ON rooms
  FOR UPDATE USING (auth.role() = 'admin');

CREATE POLICY rooms_delete_policy ON rooms
  FOR DELETE USING (auth.role() = 'admin');
