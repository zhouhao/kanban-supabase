import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database type definitions
export interface UserProfile {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  email_notifications: boolean
  created_at: string
  updated_at: string
}

export interface Board {
  id: string
  user_id: string
  name: string
  description: string | null
  color: string
  created_at: string
  updated_at: string
}

export interface Column {
  id: string
  board_id: string
  name: string
  color: string
  position: number
  created_at: string
  updated_at: string
}

export interface Task {
  id: string
  board_id: string
  column_id: string | null
  title: string
  description: string | null
  priority: 'low' | 'medium' | 'high' | 'urgent'
  due_date: string | null
  start_date: string | null
  assignee_id: string | null
  creator_id: string | null
  position: number
  is_completed: boolean
  is_deleted: boolean
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface TaskTag {
  id: string
  task_id: string
  name: string
  color: string | null
  created_at: string
}

export interface Reminder {
  id: string
  task_id: string
  reminder_time: string
  is_sent: boolean
  created_at: string
  sent_at: string | null
}
