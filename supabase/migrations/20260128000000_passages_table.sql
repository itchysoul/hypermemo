-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set micah as admin
UPDATE users SET is_admin = true WHERE username = 'micah';

-- Create passages table with full Unicode support
CREATE TABLE IF NOT EXISTS passages (
  id SERIAL PRIMARY KEY,
  type VARCHAR(50) NOT NULL CHECK (type IN ('scripture', 'poetry')),
  title TEXT NOT NULL,
  subtitle TEXT,
  introduction TEXT,
  content TEXT NOT NULL,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_passages_is_public ON passages(is_public);
CREATE INDEX IF NOT EXISTS idx_passages_created_by ON passages(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_passages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_passages_updated_at ON passages;
CREATE TRIGGER trigger_passages_updated_at
  BEFORE UPDATE ON passages
  FOR EACH ROW
  EXECUTE FUNCTION update_passages_updated_at();

-- RLS policies
ALTER TABLE passages ENABLE ROW LEVEL SECURITY;

-- Everyone can read public passages
CREATE POLICY "Public passages are viewable by everyone"
  ON passages FOR SELECT
  USING (is_public = true);

-- Users can read their own private passages
CREATE POLICY "Users can view their own passages"
  ON passages FOR SELECT
  USING (created_by = (SELECT id FROM users WHERE id = created_by));

-- Admins can insert passages
CREATE POLICY "Admins can insert passages"
  ON passages FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = created_by AND is_admin = true)
    OR created_by IS NULL
  );

-- Admins can update any passage, users can update their own
CREATE POLICY "Admins can update any passage"
  ON passages FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM users WHERE is_admin = true)
    OR created_by = (SELECT id FROM users WHERE id = created_by)
  );

-- Admins can delete any passage, users can delete their own
CREATE POLICY "Admins can delete any passage"
  ON passages FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM users WHERE is_admin = true)
    OR created_by = (SELECT id FROM users WHERE id = created_by)
  );
