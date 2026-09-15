import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Dashboard } from '../Dashboard'
import { useAuthStore } from '../../../stores/authStore'
import { useBoardStore } from '../../../stores/boardStore'

// Mock the stores
vi.mock('../../../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

vi.mock('../../../stores/boardStore', () => ({
  useBoardStore: vi.fn(),
}))

// Mock react-router-dom navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

describe('Dashboard', () => {
  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
  }

  const mockBoards = [
    {
      id: 'board-1',
      name: 'Project Board',
      description: 'Project management board',
      user_id: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'board-2',
      name: 'Personal Tasks',
      description: 'Personal to-do items',
      user_id: 'user-123',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]

  const mockSignOut = vi.fn()
  const mockFetchBoards = vi.fn()
  const mockDeleteBoard = vi.fn()
  const mockUpdateBoard = vi.fn()
  const mockCreateBoard = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      signOut: mockSignOut,
    } as any)

    vi.mocked(useBoardStore).mockReturnValue({
      boards: mockBoards,
      fetchBoards: mockFetchBoards,
      deleteBoard: mockDeleteBoard,
      updateBoard: mockUpdateBoard,
      createBoard: mockCreateBoard,
      loading: false,
    } as any)
  })

  const renderDashboard = () => {
    return render(
      <BrowserRouter>
        <Dashboard />
      </BrowserRouter>
    )
  }

  it('should render dashboard with user info', () => {
    renderDashboard()

    expect(screen.getByText(/test@example.com/i)).toBeInTheDocument()
  })

  it('should update page title on mount', () => {
    renderDashboard()
    expect(document.title).toBe('Dashboard - Xiandan Kanban')
  })

  it('should fetch boards on mount when user is present', () => {
    renderDashboard()

    expect(mockFetchBoards).toHaveBeenCalledWith('user-123')
  })

  it('should display boards', () => {
    renderDashboard()

    expect(screen.getByText('Project Board')).toBeInTheDocument()
    expect(screen.getByText('Project management board')).toBeInTheDocument()
    expect(screen.getByText('Personal Tasks')).toBeInTheDocument()
    expect(screen.getByText('Personal to-do items')).toBeInTheDocument()
  })

  it('should navigate to board when clicking on a board card', () => {
    renderDashboard()

    const boardCard = screen.getByText('Project Board').closest('div[role="button"]')
    expect(boardCard).toBeInTheDocument()

    fireEvent.click(boardCard!)

    expect(mockNavigate).toHaveBeenCalledWith('/board/board-1')
  })

  it('should show create board button', () => {
    renderDashboard()

    const createButton = screen.getByRole('button', { name: /Create Board/i })
    expect(createButton).toBeInTheDocument()
  })

  it('should show empty state when no boards exist', () => {
    vi.mocked(useBoardStore).mockReturnValue({
      boards: [],
      fetchBoards: mockFetchBoards,
      deleteBoard: mockDeleteBoard,
    } as any)

    renderDashboard()

    expect(screen.getByText(/No boards yet/i)).toBeInTheDocument()
  })

  it('should handle sign out', async () => {
    mockSignOut.mockResolvedValue(undefined)

    renderDashboard()

    const signOutButton = screen.getByRole('button', { name: /Sign Out/i })
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('should switch between boards and stats tabs', () => {
    renderDashboard()

    const statsTab = screen.getByRole('button', { name: /Statistics/i })
    fireEvent.click(statsTab)

    // Stats panel should be visible
    expect(screen.queryByText('Project Board')).not.toBeInTheDocument()

    const boardsTab = screen.getByRole('button', { name: /Boards/i })
    fireEvent.click(boardsTab)

    // Boards should be visible again
    expect(screen.getByText('Project Board')).toBeInTheDocument()
  })

  it('should open edit modal when clicking the board settings button', () => {
    renderDashboard()

    const editButtons = screen.getAllByRole('button', { name: /Edit board/i })
    fireEvent.click(editButtons[0])

    expect(screen.getByText('Edit Board')).toBeInTheDocument()
  })

  it('should delete board with confirmation from the edit modal', async () => {
    global.confirm = vi.fn(() => true)
    mockDeleteBoard.mockResolvedValue(undefined)

    renderDashboard()

    const editButtons = screen.getAllByRole('button', { name: /Edit board/i })
    fireEvent.click(editButtons[0])

    const deleteButton = screen.getByRole('button', { name: /^Delete$/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1')
    })
  })

  it('should not delete board when confirmation is cancelled', async () => {
    global.confirm = vi.fn(() => false)

    renderDashboard()

    const editButtons = screen.getAllByRole('button', { name: /Edit board/i })
    fireEvent.click(editButtons[0])

    const deleteButton = screen.getByRole('button', { name: /^Delete$/i })
    fireEvent.click(deleteButton)

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
    })

    expect(mockDeleteBoard).not.toHaveBeenCalled()
  })
})
