-- Migration: simplify_rls_policies
-- Created at: 1764401189


-- 删除现有的复杂策略
DROP POLICY IF EXISTS "Board members can view boards" ON boards;
DROP POLICY IF EXISTS "Column access based on board membership" ON columns;
DROP POLICY IF EXISTS "Task access based on board membership" ON tasks;

-- 为boards表创建简化的策略
CREATE POLICY "Users can view own boards"
  ON boards FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own boards"
  ON boards FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own boards"
  ON boards FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own boards"
  ON boards FOR DELETE
  USING (auth.uid() = user_id);

-- 为columns表创建简化的策略
CREATE POLICY "Users can manage columns in own boards"
  ON columns FOR ALL
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
    )
  );

-- 为tasks表创建简化的策略
CREATE POLICY "Users can manage tasks in own boards"
  ON tasks FOR ALL
  USING (
    board_id IN (
      SELECT id FROM boards WHERE user_id = auth.uid()
    )
  );

-- 为task_comments表创建策略
CREATE POLICY "Users can manage comments in own boards"
  ON task_comments FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE board_id IN (
        SELECT id FROM boards WHERE user_id = auth.uid()
      )
    )
  );

-- 为task_reminders表创建策略
CREATE POLICY "Users can manage reminders in own boards"
  ON task_reminders FOR ALL
  USING (
    task_id IN (
      SELECT id FROM tasks 
      WHERE board_id IN (
        SELECT id FROM boards WHERE user_id = auth.uid()
      )
    )
  );
;