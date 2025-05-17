-- Fix Database Policies for Enhanced Security
-- This script updates the Row Level Security (RLS) policies to ensure proper access control

-- First, drop existing policies
DROP POLICY IF EXISTS rooms_read_policy ON rooms;
DROP POLICY IF EXISTS rooms_write_policy ON rooms;
DROP POLICY IF EXISTS rooms_update_policy ON rooms;
DROP POLICY IF EXISTS rooms_delete_policy ON rooms;

DROP POLICY IF EXISTS users_policy ON users;
DROP POLICY IF EXISTS bookings_policy ON bookings;
DROP POLICY IF EXISTS refresh_tokens_policy ON refresh_tokens;
DROP POLICY IF EXISTS password_resets_policy ON password_resets;

-- Recreate policies with proper security

-- ROOMS policies
-- Anyone can read rooms (public data)
CREATE POLICY rooms_read_policy ON rooms
  FOR SELECT USING (TRUE);

-- Only authenticated admin users can insert rooms
CREATE POLICY rooms_write_policy ON rooms
  FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin');

-- Only authenticated admin users can update rooms
CREATE POLICY rooms_update_policy ON rooms
  FOR UPDATE USING (auth.role() = 'authenticated' AND auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin');

-- Only authenticated admin users can delete rooms
CREATE POLICY rooms_delete_policy ON rooms
  FOR DELETE USING (auth.role() = 'authenticated' AND auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin');

-- USERS policies
-- Users can only see their own data, admins can see all
CREATE POLICY users_read_policy ON users
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = id
    )
  );

-- Only admins can insert new users
CREATE POLICY users_write_policy ON users
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.jwt() ? 'role' AND 
    auth.jwt()->>'role' = 'admin'
  );

-- Users can update their own data, admins can update any user
CREATE POLICY users_update_policy ON users
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = id
    )
  );

-- Only admins can delete users
CREATE POLICY users_delete_policy ON users
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    auth.jwt() ? 'role' AND 
    auth.jwt()->>'role' = 'admin'
  );

-- BOOKINGS policies
-- Users can see their own bookings, admins can see all
CREATE POLICY bookings_read_policy ON bookings
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- Users can create their own bookings
CREATE POLICY bookings_write_policy ON bookings
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated'
  );

-- Users can update their own bookings, admins can update any booking
CREATE POLICY bookings_update_policy ON bookings
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- Users can delete their own bookings, admins can delete any booking
CREATE POLICY bookings_delete_policy ON bookings
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- REFRESH TOKENS policies
-- Users can only see their own refresh tokens, admins can see all
CREATE POLICY refresh_tokens_read_policy ON refresh_tokens
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- Users can create their own refresh tokens
CREATE POLICY refresh_tokens_write_policy ON refresh_tokens
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

-- Users can update their own refresh tokens, admins can update any
CREATE POLICY refresh_tokens_update_policy ON refresh_tokens
  FOR UPDATE USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- Users can delete their own refresh tokens, admins can delete any
CREATE POLICY refresh_tokens_delete_policy ON refresh_tokens
  FOR DELETE USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- PASSWORD RESETS policies
-- Users can only see their own password resets, admins can see all
CREATE POLICY password_resets_read_policy ON password_resets
  FOR SELECT USING (
    auth.role() = 'authenticated' AND (
      (auth.jwt() ? 'role' AND auth.jwt()->>'role' = 'admin') OR 
      auth.uid() = user_id
    )
  );

-- Only authenticated users can create password resets for themselves
CREATE POLICY password_resets_write_policy ON password_resets
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' AND 
    auth.uid() = user_id
  );

-- Only admins can delete password resets
CREATE POLICY password_resets_delete_policy ON password_resets
  FOR DELETE USING (
    auth.role() = 'authenticated' AND 
    auth.jwt() ? 'role' AND 
    auth.jwt()->>'role' = 'admin'
  );
