-- LifeOS Schema Update: Phase 0 - Data Safety
-- Adds tasks and subscriptions tables for dedicated persistence

-- =============================================
-- Tasks table: stores task node data separately
-- =============================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  canvas_id UUID REFERENCES canvas(id) ON DELETE CASCADE,
  shape_id TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  description TEXT DEFAULT '',
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  due_date DATE,
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  color TEXT DEFAULT 'blue',
  parent_task_shape_id TEXT, -- Self-referencing for subtask chains
  goal_shape_id TEXT,        -- Connected goal's shape_id
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Users can manage their own tasks"
  ON tasks FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_shape_id ON tasks(shape_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_canvas_id ON tasks(canvas_id);
CREATE INDEX IF NOT EXISTS idx_tasks_goal_shape_id ON tasks(goal_shape_id);
CREATE INDEX IF NOT EXISTS idx_tasks_parent_task ON tasks(parent_task_shape_id);

-- Updated_at trigger for tasks
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- Subscriptions table: track recurring payments
-- =============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'MNT',
  billing_day INTEGER CHECK (billing_day >= 1 AND billing_day <= 31),
  category TEXT DEFAULT 'other',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  notes TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS for subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for subscriptions
CREATE POLICY "Users can manage their own subscriptions"
  ON subscriptions FOR ALL
  USING (auth.uid() = user_id OR user_id IS NULL)
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Indexes for subscriptions
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);

-- Updated_at trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Realtime for tasks (so sync hooks work)
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
