-- =============================================================================
-- LEAGUE TABLES FOR CWL (Clan War League)
-- Execute this SQL in Supabase SQL Editor
-- =============================================================================

-- First, let's check if tracked_clans table exists (required for foreign key)
-- If not, we'll create it without a foreign key constraint

-- =============================================================================
-- 1. LEAGUE HISTORY TABLE
-- =============================================================================
-- Main table for CWL season history

CREATE TABLE IF NOT EXISTS public.league_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Season identifier (format: "YYYY-MM", e.g., "2024-01")
  season TEXT NOT NULL,
  
  -- Link to tracked clan
  clan_tag TEXT NOT NULL,
  clan_name TEXT NOT NULL,
  
  -- League information
  league_name TEXT, -- "Champion I", "Master II", etc.
  league_id INTEGER,
  
  -- Season results
  final_rank INTEGER, -- Final position (1-8)
  total_stars INTEGER DEFAULT 0,
  total_destruction NUMERIC(6,2) DEFAULT 0,
  
  -- Promotion/Demotion
  result TEXT CHECK (result IN ('promoted', 'demoted', 'stayed', NULL)),
  
  -- League state
  state TEXT DEFAULT 'inProgress' CHECK (state IN ('inProgress', 'ended')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  -- Unique constraint to avoid duplicates
  UNIQUE(clan_tag, season)
);

-- Indexes for search
CREATE INDEX IF NOT EXISTS idx_league_history_clan_tag ON public.league_history(clan_tag);
CREATE INDEX IF NOT EXISTS idx_league_history_season ON public.league_history(season);

-- Enable RLS
ALTER TABLE public.league_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-run safety)
DROP POLICY IF EXISTS "League history is viewable by everyone" ON public.league_history;
DROP POLICY IF EXISTS "Service role can insert league history" ON public.league_history;
DROP POLICY IF EXISTS "Service role can update league history" ON public.league_history;
DROP POLICY IF EXISTS "Service role can delete league history" ON public.league_history;

-- Policies
CREATE POLICY "League history is viewable by everyone"
  ON public.league_history FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role can insert league history"
  ON public.league_history FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update league history"
  ON public.league_history FOR UPDATE
  USING (TRUE);

CREATE POLICY "Service role can delete league history"
  ON public.league_history FOR DELETE
  USING (TRUE);


-- =============================================================================
-- 2. LEAGUE CLANS TABLE
-- =============================================================================
-- Clans in a CWL group (the 7 opponents + our clan)

CREATE TABLE IF NOT EXISTS public.league_clans (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Link to league history
  league_history_id UUID NOT NULL REFERENCES public.league_history(id) ON DELETE CASCADE,
  
  -- Opponent clan info
  clan_tag TEXT NOT NULL,
  clan_name TEXT NOT NULL,
  clan_level INTEGER,
  badge_url TEXT,
  
  -- Position and results
  group_rank INTEGER, -- Position in group (1-8)
  total_stars INTEGER DEFAULT 0,
  total_destruction NUMERIC(6,2) DEFAULT 0,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  ties INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  -- Unique constraint
  UNIQUE(league_history_id, clan_tag)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_league_clans_league_history ON public.league_clans(league_history_id);

-- Enable RLS
ALTER TABLE public.league_clans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "League clans are viewable by everyone" ON public.league_clans;
DROP POLICY IF EXISTS "Service role can insert league clans" ON public.league_clans;
DROP POLICY IF EXISTS "Service role can update league clans" ON public.league_clans;
DROP POLICY IF EXISTS "Service role can delete league clans" ON public.league_clans;

-- Policies
CREATE POLICY "League clans are viewable by everyone"
  ON public.league_clans FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role can insert league clans"
  ON public.league_clans FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update league clans"
  ON public.league_clans FOR UPDATE
  USING (TRUE);

CREATE POLICY "Service role can delete league clans"
  ON public.league_clans FOR DELETE
  USING (TRUE);


-- =============================================================================
-- 3. LEAGUE PARTICIPANTS TABLE
-- =============================================================================
-- Player performances in CWL

CREATE TABLE IF NOT EXISTS public.league_participants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  
  -- Link to league history
  league_history_id UUID NOT NULL REFERENCES public.league_history(id) ON DELETE CASCADE,
  
  -- Player info
  player_tag TEXT NOT NULL,
  player_name TEXT NOT NULL,
  town_hall_level INTEGER,
  
  -- Cumulative stats over the season
  total_stars INTEGER DEFAULT 0,
  total_destruction NUMERIC(6,2) DEFAULT 0,
  attacks_used INTEGER DEFAULT 0, -- Max 7 over the season
  
  -- Starting lineup position
  map_position INTEGER,
  
  -- Daily attacks detail (JSON for flexibility)
  daily_attacks JSONB DEFAULT '[]'::JSONB,
  -- Format: [{"day": 1, "stars": 3, "destruction": 100, "opponent_tag": "#XXX", "opponent_name": "Name"}, ...]
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::TEXT, NOW()) NOT NULL,
  
  -- Unique constraint
  UNIQUE(league_history_id, player_tag)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_league_participants_league_history ON public.league_participants(league_history_id);
CREATE INDEX IF NOT EXISTS idx_league_participants_player_tag ON public.league_participants(player_tag);

-- Enable RLS
ALTER TABLE public.league_participants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "League participants are viewable by everyone" ON public.league_participants;
DROP POLICY IF EXISTS "Service role can insert league participants" ON public.league_participants;
DROP POLICY IF EXISTS "Service role can update league participants" ON public.league_participants;
DROP POLICY IF EXISTS "Service role can delete league participants" ON public.league_participants;

-- Policies
CREATE POLICY "League participants are viewable by everyone"
  ON public.league_participants FOR SELECT
  USING (TRUE);

CREATE POLICY "Service role can insert league participants"
  ON public.league_participants FOR INSERT
  WITH CHECK (TRUE);

CREATE POLICY "Service role can update league participants"
  ON public.league_participants FOR UPDATE
  USING (TRUE);

CREATE POLICY "Service role can delete league participants"
  ON public.league_participants FOR DELETE
  USING (TRUE);


-- =============================================================================
-- DONE! Tables created successfully.
-- =============================================================================
