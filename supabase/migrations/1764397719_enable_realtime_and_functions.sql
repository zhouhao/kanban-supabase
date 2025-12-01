-- Migration: enable_realtime_and_functions
-- Created at: 1764397719

-- Enable real-time subscriptions
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activities;

-- Create board statistics function
CREATE OR REPLACE FUNCTION get_board_stats(board_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE is_completed = true),
    'in_progress_tasks', COUNT(*) FILTER (WHERE is_completed = false AND column_id IS NOT NULL),
    'overdue_tasks', COUNT(*) FILTER (WHERE due_date < NOW() AND is_completed = false),
    'tasks_by_priority', json_build_object(
      'low', COUNT(*) FILTER (WHERE priority = 'low'),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'urgent', COUNT(*) FILTER (WHERE priority = 'urgent')
    ),
    'completion_rate', CASE 
      WHEN COUNT(*) > 0 THEN ROUND((COUNT(*) FILTER (WHERE is_completed = true)::NUMERIC / COUNT(*)::NUMERIC) * 100, 2)
      ELSE 0
    END
  ) INTO result
  FROM tasks
  WHERE board_id = board_uuid AND is_deleted = false;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create user profile initialization function
CREATE OR REPLACE FUNCTION create_user_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger: automatically create profile when new user registers
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION create_user_profile();

-- Create default board function
CREATE OR REPLACE FUNCTION create_default_board(user_uuid UUID)
RETURNS UUID AS $$
DECLARE
  board_id UUID;
  col_id_1 UUID;
  col_id_2 UUID;
  col_id_3 UUID;
BEGIN
  -- Create default board
  INSERT INTO boards (user_id, name, description, color)
  VALUES (
    user_uuid,
    'My First Board',
    'Start managing your tasks with Xiandan Kanban',
    '#3B82F6'
  )
  RETURNING id INTO board_id;
  
  -- Create default three columns
  INSERT INTO columns (board_id, name, color, position)
  VALUES 
    (board_id, 'Todo', '#94A3B8', 0),
    (board_id, 'In Progress', '#3B82F6', 1),
    (board_id, 'Done', '#10B981', 2)
  RETURNING id INTO col_id_1, col_id_2, col_id_3;
  
  RETURN board_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;;