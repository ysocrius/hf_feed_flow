-- Migration: Add progress_history table for trend chart
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS progress_history (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for efficient user-scoped queries
CREATE INDEX IF NOT EXISTS idx_progress_history_user_recorded 
  ON progress_history(user_id, recorded_at DESC);

-- Enable RLS
ALTER TABLE progress_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only read their own history
CREATE POLICY "Users can read own progress history"
  ON progress_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Service role can insert (backend inserts via admin client)
CREATE POLICY "Service role can insert progress history"
  ON progress_history
  FOR INSERT
  WITH CHECK (true);

COMMENT ON TABLE progress_history IS 'Stores progress_score snapshots over time for trend visualization';
COMMENT ON COLUMN progress_history.score IS 'Progress score (0-100) at the time of recording';
COMMENT ON COLUMN progress_history.recorded_at IS 'When this score was captured (set by runner)';
