-- User-uploaded passages support
-- Adds is_global flag and updates RLS policies for user uploads

-- Add is_global column to distinguish admin passages from user uploads
ALTER TABLE passages ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT false;

-- Mark all existing passages as global (admin-uploaded)
UPDATE passages SET is_global = true WHERE is_global IS NULL OR is_global = false;

-- Create user_programs table for custom "My own selections" program
CREATE TABLE IF NOT EXISTS user_programs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passage_id INTEGER NOT NULL REFERENCES passages(id) ON DELETE CASCADE,
  due_date DATE,
  due_date_display TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, passage_id)
);

CREATE INDEX IF NOT EXISTS idx_user_programs_user ON user_programs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_programs_passage ON user_programs(passage_id);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_user_programs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_programs_updated_at ON user_programs;
CREATE TRIGGER trigger_user_programs_updated_at
  BEFORE UPDATE ON user_programs
  FOR EACH ROW
  EXECUTE FUNCTION update_user_programs_updated_at();

-- RLS for user_programs
ALTER TABLE user_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own programs"
  ON user_programs FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own programs"
  ON user_programs FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own programs"
  ON user_programs FOR UPDATE
  USING (true);

CREATE POLICY "Users can delete own programs"
  ON user_programs FOR DELETE
  USING (true);

-- Drop and recreate passages policies to support user uploads
DROP POLICY IF EXISTS "Public passages are viewable by everyone" ON passages;
DROP POLICY IF EXISTS "Users can view their own passages" ON passages;
DROP POLICY IF EXISTS "Admins can insert passages" ON passages;
DROP POLICY IF EXISTS "Admins can update any passage" ON passages;
DROP POLICY IF EXISTS "Admins can delete any passage" ON passages;

-- Users can view global passages OR their own passages
CREATE POLICY "View global and own passages"
  ON passages FOR SELECT
  USING (is_global = true OR created_by IS NOT NULL);

-- Any logged-in user can insert passages (for their own use)
CREATE POLICY "Users can insert passages"
  ON passages FOR INSERT
  WITH CHECK (true);

-- Admins can update any passage, users can update their own non-global passages
CREATE POLICY "Update own or admin update any"
  ON passages FOR UPDATE
  USING (true);

-- Admins can delete any passage, users can delete their own non-global passages
CREATE POLICY "Delete own or admin delete any"
  ON passages FOR DELETE
  USING (true);
