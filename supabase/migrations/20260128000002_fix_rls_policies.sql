-- Fix RLS policies to work with custom authentication
-- Since app uses custom auth (not Supabase Auth), we simplify policies
-- and rely on application-level checks for admin operations

-- Drop existing policies
DROP POLICY IF EXISTS "Public passages are viewable by everyone" ON passages;
DROP POLICY IF EXISTS "Users can view their own passages" ON passages;
DROP POLICY IF EXISTS "Admins can insert passages" ON passages;
DROP POLICY IF EXISTS "Admins can update any passage" ON passages;
DROP POLICY IF EXISTS "Admins can delete any passage" ON passages;

-- Simple read policy - all public passages are readable
CREATE POLICY "Anyone can read public passages"
  ON passages FOR SELECT
  USING (is_public = true);

-- Allow all inserts (app handles admin check)
CREATE POLICY "Allow inserts"
  ON passages FOR INSERT
  WITH CHECK (true);

-- Allow all updates (app handles admin check)
CREATE POLICY "Allow updates"
  ON passages FOR UPDATE
  USING (true);

-- Allow all deletes (app handles admin check)
CREATE POLICY "Allow deletes"
  ON passages FOR DELETE
  USING (true);
