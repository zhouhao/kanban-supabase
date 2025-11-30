import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useTaskStore } from '../taskStore'
import type { Task } from '../taskStore'

// Mock the supabase module
vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
  },
}))

// Import after mocking
import { supabase } from '@/lib/supabase'

describe('taskStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useTaskStore.setState({
      tasks: [],
      loading: false,
      error: null,
      tasksChannel: null,
    })
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('fetchAllTasksForBoard', () => {
    it('should successfully fetch all tasks for a board', async () => {
      const mockTasks: Task[] = [
        {
          id: 'task-1',
          board_id: 'board-1',
          column_id: 'col-1',
          title: 'Task 1',
          description: 'Description 1',
          position: 0,
          priority: 'medium',
          due_date: null,
          is_completed: false,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-2',
          board_id: 'board-1',
          column_id: 'col-2',
          title: 'Task 2',
          description: 'Description 2',
          position: 0,
          priority: 'high',
          due_date: null,
          is_completed: true,
          completed_at: '2024-01-02T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockTasks, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await useTaskStore.getState().fetchAllTasksForBoard('board-1')

      const state = useTaskStore.getState()
      expect(state.tasks).toEqual(mockTasks)
      expect(state.loading).toBe(false)
      expect(state.error).toBeNull()
    })

    it('should handle fetch error', async () => {
      const mockError = new Error('Failed to fetch tasks')

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await useTaskStore.getState().fetchAllTasksForBoard('board-1')

      const state = useTaskStore.getState()
      expect(state.error).toBe('Failed to fetch tasks')
      expect(state.loading).toBe(false)
    })
  })

  describe('createTask', () => {
    it('should successfully create a task', async () => {
      const newTask = {
        board_id: 'board-1',
        column_id: 'col-1',
        title: 'New Task',
        description: 'New Description',
        position: 0,
        priority: 'medium' as const,
      }

      const createdTask: Task = {
        id: 'task-new',
        ...newTask,
        due_date: null,
        is_completed: false,
        completed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdTask, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await useTaskStore.getState().createTask(newTask)

      expect(result).toEqual(createdTask)
      expect(useTaskStore.getState().tasks).toContainEqual(createdTask)
    })

    it('should return null on create error', async () => {
      const newTask = {
        board_id: 'board-1',
        column_id: 'col-1',
        title: 'New Task',
        description: '',
        position: 0,
        priority: 'medium' as const,
      }

      const mockError = new Error('Failed to create task')

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: mockError }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const result = await useTaskStore.getState().createTask(newTask)

      expect(result).toBeNull()
      expect(useTaskStore.getState().error).toBe('Failed to create task')
    })
  })

  describe('updateTask', () => {
    beforeEach(() => {
      const existingTask: Task = {
        id: 'task-1',
        board_id: 'board-1',
        column_id: 'col-1',
        title: 'Original Task',
        description: 'Original Description',
        position: 0,
        priority: 'medium',
        due_date: null,
        is_completed: false,
        completed_at: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      useTaskStore.setState({ tasks: [existingTask] })
    })

    it('should successfully update a task', async () => {
      const updates = { title: 'Updated Task', priority: 'high' as const }

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await useTaskStore.getState().updateTask('task-1', updates)

      const state = useTaskStore.getState()
      const updatedTask = state.tasks.find(t => t.id === 'task-1')
      expect(updatedTask?.title).toBe('Updated Task')
      expect(updatedTask?.priority).toBe('high')
    })
  })

  describe('deleteTask', () => {
    beforeEach(() => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          board_id: 'board-1',
          column_id: 'col-1',
          title: 'Task 1',
          description: '',
          position: 0,
          priority: 'medium',
          due_date: null,
          is_completed: false,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'task-2',
          board_id: 'board-1',
          column_id: 'col-1',
          title: 'Task 2',
          description: '',
          position: 1,
          priority: 'low',
          due_date: null,
          is_completed: false,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]
      useTaskStore.setState({ tasks })
    })

    it('should successfully delete a task', async () => {
      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      await useTaskStore.getState().deleteTask('task-1')

      const state = useTaskStore.getState()
      expect(state.tasks).toHaveLength(1)
      expect(state.tasks.find(t => t.id === 'task-1')).toBeUndefined()
    })
  })

  describe('moveTask', () => {
    beforeEach(() => {
      const tasks: Task[] = [
        {
          id: 'task-1',
          board_id: 'board-1',
          column_id: 'col-1',
          title: 'Task 1',
          description: '',
          position: 0,
          priority: 'medium',
          due_date: null,
          is_completed: false,
          completed_at: null,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]
      useTaskStore.setState({ tasks })
    })

    it('should move task to "Done" column and mark as completed', async () => {
      const mockColumnFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'col-done', name: 'Done', color: '#10B981' },
          error: null
        }),
      }))

      const mockTaskFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === 'columns') return mockColumnFrom()
        if (table === 'tasks') return mockTaskFrom()
        return mockTaskFrom()
      }) as any)

      await useTaskStore.getState().moveTask('task-1', 'col-done', 0)

      const state = useTaskStore.getState()
      const task = state.tasks.find(t => t.id === 'task-1')
      expect(task?.column_id).toBe('col-done')
      expect(task?.is_completed).toBe(true)
      expect(task?.completed_at).not.toBeNull()
    })

    it('should move task to non-Done column and mark as not completed', async () => {
      // First set task as completed
      useTaskStore.setState({
        tasks: [{
          id: 'task-1',
          board_id: 'board-1',
          column_id: 'col-done',
          title: 'Task 1',
          description: '',
          position: 0,
          priority: 'medium',
          due_date: null,
          is_completed: true,
          completed_at: '2024-01-01T00:00:00Z',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        }]
      })

      const mockColumnFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { id: 'col-todo', name: 'Todo', color: '#3B82F6' },
          error: null
        }),
      }))

      const mockTaskFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }))

      vi.mocked(supabase.from).mockImplementation(((table: string) => {
        if (table === 'columns') return mockColumnFrom()
        if (table === 'tasks') return mockTaskFrom()
        return mockTaskFrom()
      }) as any)

      await useTaskStore.getState().moveTask('task-1', 'col-todo', 0)

      const state = useTaskStore.getState()
      const task = state.tasks.find(t => t.id === 'task-1')
      expect(task?.column_id).toBe('col-todo')
      expect(task?.is_completed).toBe(false)
      expect(task?.completed_at).toBeNull()
    })
  })

  describe('subscribeToTasks', () => {
    it('should set up realtime subscription for tasks', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      useTaskStore.getState().subscribeToTasks('board-1')

      expect(supabase.channel).toHaveBeenCalledWith('tasks:board_id=eq.board-1')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()
    })
  })

  describe('unsubscribeFromTasks', () => {
    it('should unsubscribe from realtime channel', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      // Subscribe to create a channel
      useTaskStore.getState().subscribeToTasks('board-1')

      // Unsubscribe should not throw
      expect(() => {
        useTaskStore.getState().unsubscribeFromTasks()
      }).not.toThrow()
    })

    it('should handle null channel gracefully', () => {
      // Call unsubscribe without subscribing first (channel is null)
      expect(() => {
        useTaskStore.getState().unsubscribeFromTasks()
      }).not.toThrow()
    })
  })
})
