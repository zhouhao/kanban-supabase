import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useBoardStore } from '../boardStore'
import type { Board, Column } from '../boardStore'

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

describe('boardStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useBoardStore.setState({
      boards: [],
      columns: [],
      loading: false,
      error: null,
      columnsChannel: null,
    })
    // Clear all mocks
    vi.clearAllMocks()
  })

  describe('fetchBoards', () => {
    it('should successfully fetch boards for a user', async () => {
      const mockBoards: Board[] = [
        {
          id: 'board-1',
          name: 'My Board',
          description: 'Test board',
          user_id: 'user-123',
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'board-2',
          name: 'Another Board',
          description: null,
          user_id: 'user-123',
          created_at: '2024-01-02T00:00:00Z',
          updated_at: '2024-01-02T00:00:00Z',
        },
      ]

      // Mock successful fetch
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockBoards, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.fetchBoards('user-123')

      expect(useBoardStore.getState().boards).toEqual(mockBoards)
      expect(useBoardStore.getState().loading).toBe(false)
      expect(useBoardStore.getState().error).toBe(null)
    })

    it('should handle fetch errors', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' },
        }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.fetchBoards('user-123')

      expect(useBoardStore.getState().boards).toEqual([])
      expect(useBoardStore.getState().loading).toBe(false)
      expect(useBoardStore.getState().error).toBe('Database error')
    })

    it('should set loading state during fetch', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockImplementation(() => {
          // Check loading state while promise is pending
          expect(useBoardStore.getState().loading).toBe(true)
          return Promise.resolve({ data: [], error: null })
        }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.fetchBoards('user-123')

      expect(useBoardStore.getState().loading).toBe(false)
    })
  })

  describe('createBoard', () => {
    it('should successfully create a new board', async () => {
      const newBoard = {
        name: 'New Board',
        description: 'A new test board',
        user_id: 'user-123',
      }

      const createdBoard: Board = {
        id: 'board-new',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        ...newBoard,
      }

      // Mock successful create
      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdBoard, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      const result = await store.createBoard(newBoard)

      expect(result).toEqual(createdBoard)
      expect(useBoardStore.getState().boards).toContainEqual(createdBoard)
      expect(useBoardStore.getState().loading).toBe(false)
    })

    it('should return null on create error', async () => {
      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Creation failed' },
        }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      const result = await store.createBoard({
        name: 'Test',
        description: null,
        user_id: 'user-123',
      })

      expect(result).toBe(null)
      expect(useBoardStore.getState().error).toBe('Creation failed')
    })
  })

  describe('updateBoard', () => {
    it('should successfully update a board', async () => {
      // Set initial state with a board
      const initialBoard: Board = {
        id: 'board-1',
        name: 'Old Name',
        description: 'Old description',
        user_id: 'user-123',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      useBoardStore.setState({ boards: [initialBoard] })

      const updates = { name: 'New Name' }

      // Mock successful update
      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.updateBoard('board-1', updates)

      const updatedBoard = useBoardStore.getState().boards[0]
      expect(updatedBoard.name).toBe('New Name')
      expect(updatedBoard.description).toBe('Old description')
      expect(useBoardStore.getState().loading).toBe(false)
    })

    it('should handle update errors', async () => {
      useBoardStore.setState({
        boards: [
          {
            id: 'board-1',
            name: 'Test',
            description: null,
            user_id: 'user-123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      })

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Update failed' } }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.updateBoard('board-1', { name: 'New Name' })

      expect(useBoardStore.getState().error).toBe('Update failed')
    })
  })

  describe('deleteBoard', () => {
    it('should successfully delete a board', async () => {
      // Set initial state with boards
      useBoardStore.setState({
        boards: [
          {
            id: 'board-1',
            name: 'Board 1',
            description: null,
            user_id: 'user-123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'board-2',
            name: 'Board 2',
            description: null,
            user_id: 'user-123',
            created_at: '2024-01-02T00:00:00Z',
            updated_at: '2024-01-02T00:00:00Z',
          },
        ],
      })

      // Mock successful delete
      const mockFrom = vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.deleteBoard('board-1')

      expect(useBoardStore.getState().boards).toHaveLength(1)
      expect(useBoardStore.getState().boards[0].id).toBe('board-2')
      expect(useBoardStore.getState().loading).toBe(false)
    })

    it('should handle delete errors', async () => {
      useBoardStore.setState({
        boards: [
          {
            id: 'board-1',
            name: 'Board 1',
            description: null,
            user_id: 'user-123',
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      })

      const mockFrom = vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: { message: 'Delete failed' } }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.deleteBoard('board-1')

      expect(useBoardStore.getState().boards).toHaveLength(1)
      expect(useBoardStore.getState().error).toBe('Delete failed')
    })
  })

  describe('fetchColumns', () => {
    it('should successfully fetch columns for a board', async () => {
      const mockColumns: Column[] = [
        {
          id: 'col-1',
          board_id: 'board-1',
          name: 'To Do',
          color: '#3B82F6',
          position: 0,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
        {
          id: 'col-2',
          board_id: 'board-1',
          name: 'In Progress',
          color: '#F59E0B',
          position: 1,
          created_at: '2024-01-01T00:00:00Z',
          updated_at: '2024-01-01T00:00:00Z',
        },
      ]

      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({ data: mockColumns, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.fetchColumns('board-1')

      expect(useBoardStore.getState().columns).toEqual(mockColumns)
      expect(useBoardStore.getState().loading).toBe(false)
    })

    it('should handle fetch columns errors', async () => {
      const mockFrom = vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Fetch failed' },
        }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.fetchColumns('board-1')

      expect(useBoardStore.getState().columns).toEqual([])
      expect(useBoardStore.getState().error).toBe('Fetch failed')
    })
  })

  describe('createColumn', () => {
    it('should successfully create a new column', async () => {
      const newColumn = {
        board_id: 'board-1',
        name: 'Done',
        color: '#10B981',
        position: 2,
      }

      const createdColumn: Column = {
        id: 'col-new',
        created_at: '2024-01-03T00:00:00Z',
        updated_at: '2024-01-03T00:00:00Z',
        ...newColumn,
      }

      const mockFrom = vi.fn(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: createdColumn, error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      const result = await store.createColumn(newColumn)

      expect(result).toEqual(createdColumn)
      expect(useBoardStore.getState().columns).toContainEqual(createdColumn)
    })
  })

  describe('updateColumn', () => {
    it('should successfully update a column', async () => {
      const initialColumn: Column = {
        id: 'col-1',
        board_id: 'board-1',
        name: 'Old Name',
        color: '#6B7280',
        position: 0,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      }
      useBoardStore.setState({ columns: [initialColumn] })

      const updates = { name: 'New Name' }

      const mockFrom = vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.updateColumn('col-1', updates)

      const updatedColumn = useBoardStore.getState().columns[0]
      expect(updatedColumn.name).toBe('New Name')
      expect(updatedColumn.position).toBe(0)
    })
  })

  describe('deleteColumn', () => {
    it('should successfully delete a column', async () => {
      useBoardStore.setState({
        columns: [
          {
            id: 'col-1',
            board_id: 'board-1',
            name: 'To Do',
            color: '#3B82F6',
            position: 0,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
          {
            id: 'col-2',
            board_id: 'board-1',
            name: 'Done',
            color: '#10B981',
            position: 1,
            created_at: '2024-01-01T00:00:00Z',
            updated_at: '2024-01-01T00:00:00Z',
          },
        ],
      })

      const mockFrom = vi.fn(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }))
      vi.mocked(supabase.from).mockImplementation(mockFrom as any)

      const store = useBoardStore.getState()
      await store.deleteColumn('col-1')

      expect(useBoardStore.getState().columns).toHaveLength(1)
      expect(useBoardStore.getState().columns[0].id).toBe('col-2')
    })
  })

  describe('subscribeToColumns', () => {
    it('should subscribe to realtime column updates', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }

      vi.mocked(supabase.channel).mockReturnValue(mockChannel as any)

      const store = useBoardStore.getState()
      store.subscribeToColumns('board-1')

      expect(supabase.channel).toHaveBeenCalledWith('columns:board-1')
      expect(mockChannel.on).toHaveBeenCalled()
      expect(mockChannel.subscribe).toHaveBeenCalled()

      // The channel is set after the chain completes
      const state = useBoardStore.getState()
      expect(state.columnsChannel).toBeDefined()
      expect(state.columnsChannel).toEqual(expect.objectContaining({
        on: expect.any(Function),
        subscribe: expect.any(Function),
      }))
    })

    it('should unsubscribe from previous channel before subscribing to new one', () => {
      const oldChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      useBoardStore.setState({ columnsChannel: oldChannel as any })

      const newChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn().mockReturnThis(),
      }
      vi.mocked(supabase.channel).mockReturnValue(newChannel as any)

      const store = useBoardStore.getState()
      store.subscribeToColumns('board-2')

      expect(supabase.removeChannel).toHaveBeenCalledWith(oldChannel)

      // Verify the new channel is set
      const state = useBoardStore.getState()
      expect(state.columnsChannel).toBeDefined()
      expect(state.columnsChannel).toEqual(expect.objectContaining({
        on: expect.any(Function),
        subscribe: expect.any(Function),
      }))
    })
  })

  describe('unsubscribeFromColumns', () => {
    it('should unsubscribe from columns channel', () => {
      const mockChannel = {
        on: vi.fn().mockReturnThis(),
        subscribe: vi.fn(),
      }
      useBoardStore.setState({ columnsChannel: mockChannel as any })

      const store = useBoardStore.getState()
      store.unsubscribeFromColumns()

      expect(supabase.removeChannel).toHaveBeenCalledWith(mockChannel)
      expect(useBoardStore.getState().columnsChannel).toBe(null)
    })

    it('should do nothing if no channel is active', () => {
      useBoardStore.setState({ columnsChannel: null })

      const store = useBoardStore.getState()
      store.unsubscribeFromColumns()

      expect(supabase.removeChannel).not.toHaveBeenCalled()
    })
  })
})
