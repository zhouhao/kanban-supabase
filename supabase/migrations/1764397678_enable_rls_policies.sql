-- Migration: enable_rls_policies
-- Created at: 1764397678

-- 启用RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;

-- 用户资料表RLS策略
CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 看板表RLS策略
CREATE POLICY "Board owners can manage boards" ON boards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Board members can view boards" ON boards
  FOR SELECT USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    )
  );

-- 看板成员表RLS策略
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

-- 列配置表RLS策略
CREATE POLICY "Column access based on board membership" ON columns
  FOR ALL USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
      UNION
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- 任务表RLS策略
CREATE POLICY "Task access based on board membership" ON tasks
  FOR ALL USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
      UNION
      SELECT board_id FROM board_members WHERE user_id = auth.uid()
    )
  );

-- 任务标签表RLS策略
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

-- 提醒设置表RLS策略
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

-- 任务活动日志表RLS策略
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

-- 邮件日志表RLS策略
CREATE POLICY "Users can view own email logs" ON email_logs
  FOR SELECT USING (
    recipient_email IN (
      SELECT email FROM user_profiles WHERE id = auth.uid()
    )
  );;