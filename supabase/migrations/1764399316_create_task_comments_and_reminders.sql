-- Migration: create_task_comments_and_reminders
-- Created at: 1764399316

-- 创建任务评论表
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建任务提醒表
CREATE TABLE IF NOT EXISTS public.task_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_time TIMESTAMPTZ NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_comments_user_id ON public.task_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_task_id ON public.task_reminders(task_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_user_id ON public.task_reminders(user_id);
CREATE INDEX IF NOT EXISTS idx_task_reminders_time ON public.task_reminders(reminder_time, is_sent);

-- 启用RLS
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reminders ENABLE ROW LEVEL SECURITY;

-- 创建RLS策略
CREATE POLICY "Users can view task comments" ON public.task_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create task comments" ON public.task_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own comments" ON public.task_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own comments" ON public.task_comments
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view task reminders" ON public.task_reminders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create task reminders" ON public.task_reminders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own reminders" ON public.task_reminders
  FOR DELETE USING (auth.uid() = user_id);
;