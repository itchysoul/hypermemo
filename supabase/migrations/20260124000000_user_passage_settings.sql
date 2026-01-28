-- User passage settings for font preferences per passage
-- Run: supabase db push (local) or apply via Supabase dashboard (production)

CREATE TABLE IF NOT EXISTS user_passage_settings (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  passage_id INTEGER NOT NULL,
  font_family VARCHAR(100) DEFAULT 'Georgia',
  font_size INTEGER DEFAULT 18,
  include_optional BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, passage_id)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_user_passage_settings_user_passage 
  ON user_passage_settings(user_id, passage_id);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_passage_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_passage_settings_updated_at ON user_passage_settings;
CREATE TRIGGER trigger_user_passage_settings_updated_at
  BEFORE UPDATE ON user_passage_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_user_passage_settings_updated_at();

-- Enable RLS
ALTER TABLE user_passage_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view own passage settings"
  ON user_passage_settings FOR SELECT
  USING (true);

CREATE POLICY "Users can insert own passage settings"
  ON user_passage_settings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Users can update own passage settings"
  ON user_passage_settings FOR UPDATE
  USING (true);
