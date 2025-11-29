import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { RealtimeChannel } from '@supabase/supabase-js';

export interface Board {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Column {
  id: string;
  board_id: string;
  name: string;
  position: number;
  created_at: string;
  updated_at: string;
}

interface BoardState {
  boards: Board[];
  columns: Column[];
  loading: boolean;
  error: string | null;
  columnsChannel: RealtimeChannel | null;

  // Board CRUD
  fetchBoards: (userId: string) => Promise<void>;
  createBoard: (board: Omit<Board, 'id' | 'created_at' | 'updated_at'>) => Promise<Board | null>;
  updateBoard: (id: string, updates: Partial<Board>) => Promise<void>;
  deleteBoard: (id: string) => Promise<void>;

  // Column CRUD
  fetchColumns: (boardId: string) => Promise<void>;
  createColumn: (column: Omit<Column, 'id' | 'created_at' | 'updated_at'>) => Promise<Column | null>;
  updateColumn: (id: string, updates: Partial<Column>) => Promise<void>;
  deleteColumn: (id: string) => Promise<void>;

  // Realtime
  subscribeToColumns: (boardId: string) => void;
  unsubscribeFromColumns: () => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  boards: [],
  columns: [],
  loading: false,
  error: null,
  columnsChannel: null,

  fetchBoards: async (userId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('boards')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      set({ boards: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createBoard: async (board) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('boards')
        .insert([board])
        .select()
        .single();

      if (error) throw error;
      set(state => ({ 
        boards: [data, ...state.boards],
        loading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateBoard: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('boards')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        boards: state.boards.map(b => b.id === id ? { ...b, ...updates } : b),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteBoard: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('boards')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        boards: state.boards.filter(b => b.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  fetchColumns: async (boardId: string) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('columns')
        .select('*')
        .eq('board_id', boardId)
        .order('position', { ascending: true });

      if (error) throw error;
      set({ columns: data || [], loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  createColumn: async (column) => {
    set({ loading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('columns')
        .insert([column])
        .select()
        .single();

      if (error) throw error;
      set(state => ({ 
        columns: [...state.columns, data],
        loading: false 
      }));
      return data;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      return null;
    }
  },

  updateColumn: async (id, updates) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('columns')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        columns: state.columns.map(c => c.id === id ? { ...c, ...updates } : c),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  deleteColumn: async (id) => {
    set({ loading: true, error: null });
    try {
      const { error } = await supabase
        .from('columns')
        .delete()
        .eq('id', id);

      if (error) throw error;
      set(state => ({
        columns: state.columns.filter(c => c.id !== id),
        loading: false
      }));
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },

  subscribeToColumns: (boardId: string) => {
    // 取消订阅之前的channel
    get().unsubscribeFromColumns();

    const channel = supabase
      .channel(`columns:${boardId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'columns',
          filter: `board_id=eq.${boardId}`,
        },
        (payload) => {
          const { eventType, new: newRecord, old: oldRecord } = payload;

          set((state) => {
            let updatedColumns = [...state.columns];

            switch (eventType) {
              case 'INSERT':
                if (newRecord && !updatedColumns.find(c => c.id === newRecord.id)) {
                  updatedColumns.push(newRecord as Column);
                }
                break;
              case 'UPDATE':
                if (newRecord) {
                  updatedColumns = updatedColumns.map(c =>
                    c.id === newRecord.id ? (newRecord as Column) : c
                  );
                }
                break;
              case 'DELETE':
                if (oldRecord) {
                  updatedColumns = updatedColumns.filter(c => c.id !== oldRecord.id);
                }
                break;
            }

            return { columns: updatedColumns.sort((a, b) => a.position - b.position) };
          });
        }
      )
      .subscribe();

    set({ columnsChannel: channel });
  },

  unsubscribeFromColumns: () => {
    const channel = get().columnsChannel;
    if (channel) {
      supabase.removeChannel(channel);
      set({ columnsChannel: null });
    }
  },
}));
