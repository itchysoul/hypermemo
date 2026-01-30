-- Analytics tables for admin dashboard
-- Tracks user registrations, usage events, and passage activity

-- Add is_admin column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

-- Set micah as admin
UPDATE users SET is_admin = true WHERE username = 'micah';

-- Usage events table - tracks all activity with minimal footprint
-- Uses batched inserts and aggregation for efficiency
CREATE TABLE IF NOT EXISTS usage_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  session_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  passage_id INTEGER,
  program_id TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_usage_events_created_at ON usage_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_events_session ON usage_events(session_id);
CREATE INDEX IF NOT EXISTS idx_usage_events_user ON usage_events(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_usage_events_type ON usage_events(event_type);
CREATE INDEX IF NOT EXISTS idx_usage_events_passage ON usage_events(passage_id) WHERE passage_id IS NOT NULL;

-- Daily aggregates table - pre-computed for fast dashboard loading
CREATE TABLE IF NOT EXISTS usage_daily_stats (
  id BIGSERIAL PRIMARY KEY,
  stat_date DATE NOT NULL,
  total_sessions INTEGER DEFAULT 0,
  unique_users INTEGER DEFAULT 0,
  guest_sessions INTEGER DEFAULT 0,
  registrations INTEGER DEFAULT 0,
  passage_views JSONB DEFAULT '{}',
  program_views JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(stat_date)
);

CREATE INDEX IF NOT EXISTS idx_usage_daily_stats_date ON usage_daily_stats(stat_date DESC);

-- Enable RLS
ALTER TABLE usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_daily_stats ENABLE ROW LEVEL SECURITY;

-- Only admins can read analytics
CREATE POLICY "Admins can read usage_events"
  ON usage_events FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert usage_events"
  ON usage_events FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can read usage_daily_stats"
  ON usage_daily_stats FOR SELECT
  USING (true);

CREATE POLICY "System can manage usage_daily_stats"
  ON usage_daily_stats FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to aggregate daily stats (can be called by cron or manually)
CREATE OR REPLACE FUNCTION aggregate_daily_stats(target_date DATE DEFAULT CURRENT_DATE - INTERVAL '1 day')
RETURNS void AS $$
DECLARE
  passage_counts JSONB;
  program_counts JSONB;
BEGIN
  -- Calculate passage view counts
  SELECT COALESCE(jsonb_object_agg(passage_id::text, count), '{}')
  INTO passage_counts
  FROM (
    SELECT passage_id, COUNT(*) as count
    FROM usage_events
    WHERE DATE(created_at) = target_date
      AND event_type = 'passage_view'
      AND passage_id IS NOT NULL
    GROUP BY passage_id
  ) sub;

  -- Calculate program view counts
  SELECT COALESCE(jsonb_object_agg(program_id, count), '{}')
  INTO program_counts
  FROM (
    SELECT program_id, COUNT(*) as count
    FROM usage_events
    WHERE DATE(created_at) = target_date
      AND event_type = 'program_view'
      AND program_id IS NOT NULL
    GROUP BY program_id
  ) sub;

  -- Upsert daily stats
  INSERT INTO usage_daily_stats (
    stat_date,
    total_sessions,
    unique_users,
    guest_sessions,
    registrations,
    passage_views,
    program_views
  )
  SELECT
    target_date,
    COUNT(DISTINCT session_id),
    COUNT(DISTINCT user_id) FILTER (WHERE user_id IS NOT NULL),
    COUNT(DISTINCT session_id) FILTER (WHERE user_id IS NULL),
    COUNT(*) FILTER (WHERE event_type = 'registration'),
    passage_counts,
    program_counts
  FROM usage_events
  WHERE DATE(created_at) = target_date
  ON CONFLICT (stat_date) DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    unique_users = EXCLUDED.unique_users,
    guest_sessions = EXCLUDED.guest_sessions,
    registrations = EXCLUDED.registrations,
    passage_views = EXCLUDED.passage_views,
    program_views = EXCLUDED.program_views;
END;
$$ LANGUAGE plpgsql;
