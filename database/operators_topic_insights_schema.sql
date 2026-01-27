-- Topic Insights System Schema Changes
-- Extends Operators system with AI-powered topic generation

-- 1. Extend operators_users table with bio fields
ALTER TABLE operators_users
ADD COLUMN IF NOT EXISTS role_title TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 2. Extend operators_candidates table with bio fields
ALTER TABLE operators_candidates
ADD COLUMN IF NOT EXISTS role_title TEXT,
ADD COLUMN IF NOT EXISTS industry TEXT,
ADD COLUMN IF NOT EXISTS bio TEXT;

-- 3. Create operators_topics table (AO Topic Library)
CREATE TABLE IF NOT EXISTS operators_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL, -- 1-2 sentences
  category TEXT NOT NULL CHECK (category IN ('People', 'Culture', 'Decisions', 'Ops', 'Clients', 'Growth', 'Integrity', 'Health')),
  tags TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Create operators_event_topics table
CREATE TABLE IF NOT EXISTS operators_event_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES operators_events(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL CHECK (rank >= 1 AND rank <= 5),
  topic_title TEXT NOT NULL,
  topic_summary TEXT NOT NULL, -- 1-2 sentences
  why_this_fits_this_room TEXT NOT NULL, -- 1 sentence
  starter_prompts JSONB NOT NULL, -- Array of 3-5 questions
  created_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by TEXT NOT NULL DEFAULT 'AI' CHECK (generated_by = 'AI'),
  is_locked BOOLEAN DEFAULT false,
  UNIQUE(event_id, rank)
);

-- Create index on event_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_operators_event_topics_event_id ON operators_event_topics(event_id);

-- 5. Add rsvp_closed field to operators_events
ALTER TABLE operators_events
ADD COLUMN IF NOT EXISTS rsvp_closed BOOLEAN DEFAULT false;

-- Create index on rsvp_closed for filtering
CREATE INDEX IF NOT EXISTS idx_operators_events_rsvp_closed ON operators_events(rsvp_closed);
