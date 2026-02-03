-- LifeOS Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Canvas table: stores canvas metadata and tldraw document state
CREATE TABLE IF NOT EXISTS canvas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'My Canvas',
  document JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE canvas ENABLE ROW LEVEL SECURITY;

-- RLS policies for canvas
CREATE POLICY "Users can view their own canvas"
  ON canvas FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own canvas"
  ON canvas FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own canvas"
  ON canvas FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own canvas"
  ON canvas FOR DELETE
  USING (auth.uid() = user_id);

-- Anonymous access policy (for development without auth)
CREATE POLICY "Allow anonymous access for development"
  ON canvas FOR ALL
  USING (user_id IS NULL)
  WITH CHECK (user_id IS NULL);

-- Goals table: stores goal nodes data
CREATE TABLE IF NOT EXISTS goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  target_date DATE,
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  milestones JSONB DEFAULT '[]',
  check_ins JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for goals
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for goals
CREATE POLICY "Users can manage their own goals"
  ON goals FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Habits table: stores habit tracking data
CREATE TABLE IF NOT EXISTS habits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color TEXT DEFAULT 'green',
  check_ins JSONB DEFAULT '[]',
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for habits
ALTER TABLE habits ENABLE ROW LEVEL SECURITY;

-- RLS policies for habits
CREATE POLICY "Users can manage their own habits"
  ON habits FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Trigger for habits updated_at
CREATE TRIGGER update_habits_updated_at
  BEFORE UPDATE ON habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for habits
CREATE INDEX IF NOT EXISTS idx_habits_canvas_id ON habits(canvas_id);
CREATE INDEX IF NOT EXISTS idx_habits_user_id ON habits(user_id);
CREATE INDEX IF NOT EXISTS idx_habits_shape_id ON habits(shape_id);

-- Video projects table: stores video project nodes data
CREATE TABLE IF NOT EXISTS video_projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'processing', 'completed', 'failed')),
  source_url TEXT,
  output_url TEXT,
  thumbnail_url TEXT,
  duration INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for video_projects
ALTER TABLE video_projects ENABLE ROW LEVEL SECURITY;

-- RLS policies for video_projects
CREATE POLICY "Users can manage their own video projects"
  ON video_projects FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to all tables
CREATE TRIGGER update_canvas_updated_at
  BEFORE UPDATE ON canvas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at
  BEFORE UPDATE ON goals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_video_projects_updated_at
  BEFORE UPDATE ON video_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_canvas_user_id ON canvas(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_canvas_id ON goals(canvas_id);
CREATE INDEX IF NOT EXISTS idx_goals_user_id ON goals(user_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_canvas_id ON video_projects(canvas_id);
CREATE INDEX IF NOT EXISTS idx_video_projects_user_id ON video_projects(user_id);

-- Enable Realtime for canvas table
ALTER PUBLICATION supabase_realtime ADD TABLE canvas;

-- ===========================================
-- Storage Configuration
-- ===========================================
-- Run this in the Supabase Dashboard > Storage

-- 1. Create a bucket called 'videos'
--    - Go to Storage > New Bucket
--    - Name: videos
--    - Public: Yes (for easy access)
--    - File size limit: 100MB

-- 2. Set up storage policies (run in SQL Editor):

-- Allow public read access
CREATE POLICY "Public read access for videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

-- Allow authenticated uploads
CREATE POLICY "Allow uploads for authenticated users"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

-- Allow anonymous uploads (for development)
CREATE POLICY "Allow anonymous uploads"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos' AND auth.role() = 'anon');

-- Allow delete for owners
CREATE POLICY "Allow delete for owners"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');
