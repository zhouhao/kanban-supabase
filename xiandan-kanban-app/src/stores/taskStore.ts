import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Task {
  id: string;
  board_id: string;
  column_id: string;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  due_date: string | null;
  start_date: string | null;
  assignee_id: string | null;
  creator_id: string;
  position: number;
  is_completed: boolean;
  is_deleted: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface TaskReminder {
  id: string;
  task_id: string;
  user_id: string;
  reminder_time: string;
  is_sent: boolean;
  created_at: string;
}

interface TaskState {
  tasks: Task[];
  comments: Record<string, TaskComment[]>;
  reminders: Record<string, TaskReminder[]>;
  loading: boolean;
  error: string | null;

  // Task CRUD
  fetchTasks: (columnId: string) => Promise<void>;
  fetchAllTasksForBoard: (boardId: string) => Promise<void>;
  createTask: (task: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'is_deleted' | 'is_completed' | 'completed_at'>) => Promise<Task | null>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (taskId: string, newColumnId: string, newPosition: number) => Promise<void>;

  // Realtime subscriptions
  subscribeToTasks: (boardId: string) => void;
  unsubscribeFromTasks: () => void;

  // Comments
  fetchComments: (taskId: string) => Promise<void>;
  addComment: (taskId: string, content: string, userId: string) => Promise<void>;

  // Reminders
  fetchReminders: (taskId: string) => Promise<void>;
  addReminder: (taskId: string, userId: string, reminderTime: string) => Promise<void>;
  deleteReminder: (id: string) => Promise<void>;

  // Batch operations
  batchUpdateTasks: (updates: Array<{ id: string; position: number }>) => Promise<void>;
}

let tasksChannel: RealtimeChannel | null = null;

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  comments: {},
  reminders: {},
  loading: false,
  error: null,

  fetchTasks: async (columnId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('column_id', columnId)
        .eq('is_deleted', false)
        .order('position', { ascending: true });

      if (error) throw error;

      // Merge tasks instead of replacing - keep tasks from other columns
      set(state => {
        const otherTasks = state.tasks.filter(t => t.column_id !== columnId);
        const newTasks = [...otherTasks, ...(data || [])];
        return { tasks: newTasks, loading: false };
      });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createTask: async (task) => {
    set({ loading: true, error: null });
    try {
      const { data, error} = await supabase
        .from('tasks')
        .insert([{ ...task, is_completed: false, is_deleted: false }])
        .select()
        .single();

      if (error) throw error;
      set(state => ({ 
        tasks: [...state.tasks, data],
        loading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateTask: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteTask: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ is_deleted: true })
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        tasks: state.tasks.filter(t => t.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  moveTask: async (taskId, newColumnId, newPosition) => {
    set({ loading: true, error: null });
    try {
      // Fetch column name to check if it's a "Done" column
      const { data: columnData, error: columnError } = await supabase
        .from('columns')
        .select('name')
        .eq('id', newColumnId)
        .single();

      if (columnError) throw columnError;

      // Check if moving to or from a "Done" column (case-insensitive)
      const isDoneColumn = columnData.name.toLowerCase().includes('done');

      // Prepare update object
      const updates: any = {
        column_id: newColumnId,
        position: newPosition,
      };

      // Auto-complete tasks when moved to "Done" column
      if (isDoneColumn) {
        updates.is_completed = true;
        updates.completed_at = new Date().toISOString();
      } else {
        // Uncomplete tasks when moved away from "Done" column
        updates.is_completed = false;
        updates.completed_at = null;
      }

      const { error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', taskId);

      if (error) throw error;

      // Update local state immediately for better UX (realtime will sync)
      set(state => ({
        tasks: state.tasks.map(t =>
          t.id === taskId ? { ...t, ...updates } : t
        ),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchComments: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .select('*')
        .eq('task_id', taskId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      set(state => ({
        comments: { ...state.comments, [taskId]: data || [] }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addComment: async (taskId, content, userId) => {
    try {
      const { data, error } = await supabase
        .from('task_comments')
        .insert([{ task_id: taskId, content, user_id: userId }])
        .select()
        .single();

      if (error) throw error;
      set(state => ({
        comments: {
          ...state.comments,
          [taskId]: [...(state.comments[taskId] || []), data]
        }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  fetchReminders: async (taskId) => {
    try {
      const { data, error } = await supabase
        .from('task_reminders')
        .select('*')
        .eq('task_id', taskId)
        .order('reminder_time', { ascending: true });

      if (error) throw error;
      set(state => ({
        reminders: { ...state.reminders, [taskId]: data || [] }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  addReminder: async (taskId, userId, reminderTime) => {
    try {
      const { data, error } = await supabase
        .from('task_reminders')
        .insert([{ 
          task_id: taskId, 
          user_id: userId, 
          reminder_time: reminderTime,
          is_sent: false 
        }])
        .select()
        .single();

      if (error) throw error;
      set(state => ({
        reminders: {
          ...state.reminders,
          [taskId]: [...(state.reminders[taskId] || []), data]
        }
      }));
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  deleteReminder: async (id) => {
    try {
      const { error } = await supabase
        .from('task_reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      set(state => {
        const newReminders = { ...state.reminders };
        Object.keys(newReminders).forEach(taskId => {
          newReminders[taskId] = newReminders[taskId].filter(r => r.id !== id);
        });
        return { reminders: newReminders };
      });
    } catch (error: any) {
      set({ error: error.message });
    }
  },

  batchUpdateTasks: async (updates) => {
    set({ loading: true, error: null });
    try {
      const promises = updates.map(({ id, position }) =>
        supabase.from('tasks').update({ position }).eq('id', id)
      );

      await Promise.all(promises);

      set(state => ({
        tasks: state.tasks.map(task => {
          const update = updates.find(u => u.id === task.id);
          return update ? { ...task, position: update.position } : task;
        }),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchAllTasksForBoard: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('board_id', boardId)
        .eq('is_deleted', false)
        .order('position', { ascending: true });

      if (error) throw error;
      set({ tasks: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  subscribeToTasks: (boardId: string) => {
    // Unsubscribe from previous subscription if exists
    if (tasksChannel) {
      supabase.removeChannel(tasksChannel);
      tasksChannel = null;
    }

    // Create new subscription for tasks in this board
    tasksChannel = supabase
      .channel(`tasks:board_id=eq.${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const newTask = payload.new as Task;
            if (!newTask.is_deleted) {
              set(state => {
                // Prevent duplicates from optimistic updates
                const exists = state.tasks.some(t => t.id === newTask.id);
                return {
                  tasks: exists ? state.tasks : [...state.tasks, newTask],
                };
              });
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedTask = payload.new as Task;
            set(state => ({
              tasks: updatedTask.is_deleted
                ? state.tasks.filter(t => t.id !== updatedTask.id)
                : state.tasks.map(t => t.id === updatedTask.id ? updatedTask : t),
            }));
          } else if (payload.eventType === 'DELETE') {
            set(state => ({
              tasks: state.tasks.filter(t => t.id !== payload.old.id),
            }));
          }
        }
      )
      .subscribe();
  },

  unsubscribeFromTasks: () => {
    if (tasksChannel) {
      supabase.removeChannel(tasksChannel);
      tasksChannel = null;
    }
  },
}));
