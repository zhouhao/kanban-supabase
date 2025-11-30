-- Migration: enable_rls_policies
-- Created at: 1764397678

-- Enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- User profiles table RLS policies
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Boards table RLS policies
CREATE POLICY "Board owners can manage boards" ON boards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Board members can view boards" ON boards
  FOR SELECT USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    )
  );

-- Board members table RLS policies
CREATE POLICY "Board members can view members" ON board_members
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Board owners can manage members" ON board_members
  FOR ALL USING (
    board_id IN (
      SELECT id FROM boards 
      WHERE user_id = auth.uid()
    )
  );

-- Columns configuration table RLS policies
CREATE POLICY "Column access based on board membership" ON columns
  FOR ALL USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
      UNION
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Tasks table RLS policies
CREATE POLICY "Task access based on board membership" ON tasks
  FOR ALL USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
      UNION
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- Task tags table RLS policies
CREATE POLICY "Task tags access" ON task_tags
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.board_id IN (
        SELECT id FROM boards WHERE user_id = auth.uid()
        UNION
        SELECT board_id FROM board_members WHERE user_id = auth.uid()
      )
    )
  );

-- Reminders table RLS policies
CREATE POLICY "Reminders access" ON reminders
  FOR ALL USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.board_id IN (
        SELECT id FROM boards WHERE user_id = auth.uid()
        UNION
        SELECT board_id FROM board_members WHERE user_id = auth.uid()
      )
    )
  );

-- Task activities table RLS policies
CREATE POLICY "Task activities access" ON task_activities
  FOR SELECT USING (
    task_id IN (
      SELECT t.id FROM tasks t
      WHERE t.board_id IN (
        SELECT id FROM boards WHERE user_id = auth.uid()
        UNION
        SELECT board_id FROM board_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Task activities insert" ON task_activities
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Email logs table RLS policies
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (
    recipient_email IN (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  );;