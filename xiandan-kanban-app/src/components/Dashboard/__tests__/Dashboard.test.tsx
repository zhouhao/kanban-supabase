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
      name: '项目看板',
      description: '项目管理看板',
      user_id: 'user-123',
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'board-2',
      name: '个人任务',
      description: '个人待办事项',
      user_id: 'user-123',
      created_at: '2024-01-02T00:00:00Z',
      updated_at: '2024-01-02T00:00:00Z',
    },
  ]

  const mockSignOut = vi.fn()
  const mockFetchBoards = vi.fn()
  const mockDeleteBoard = vi.fn()

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
    expect(document.title).toBe('仪表板 - 咸蛋快板')
  })

  it('should fetch boards on mount when user is present', () => {
    renderDashboard()

    expect(mockFetchBoards).toHaveBeenCalledWith('user-123')
  })

  it('should display boards', () => {
    renderDashboard()

    expect(screen.getByText('项目看板')).toBeInTheDocument()
    expect(screen.getByText('项目管理看板')).toBeInTheDocument()
    expect(screen.getByText('个人任务')).toBeInTheDocument()
    expect(screen.getByText('个人待办事项')).toBeInTheDocument()
  })

  it('should navigate to board when clicking on a board card', () => {
    renderDashboard()

    const boardCard = screen.getByText('项目看板').closest('div[role="button"]')
    expect(boardCard).toBeInTheDocument()

    fireEvent.click(boardCard!)

    expect(mockNavigate).toHaveBeenCalledWith('/board/board-1')
  })

  it('should show create board button', () => {
    renderDashboard()

    const createButton = screen.getByRole('button', { name: /创建看板/i })
    expect(createButton).toBeInTheDocument()
  })

  it('should show empty state when no boards exist', () => {
    vi.mocked(useBoardStore).mockReturnValue({
      boards: [],
      fetchBoards: mockFetchBoards,
      deleteBoard: mockDeleteBoard,
    } as any)

    renderDashboard()

    expect(screen.getByText(/还没有看板/i)).toBeInTheDocument()
  })

  it('should handle sign out', async () => {
    mockSignOut.mockResolvedValue(undefined)

    renderDashboard()

    const signOutButton = screen.getByRole('button', { name: /退出登录/i })
    fireEvent.click(signOutButton)

    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })
  })

  it('should switch between boards and stats tabs', () => {
    renderDashboard()

    const statsTab = screen.getByRole('button', { name: /统计/i })
    fireEvent.click(statsTab)

    // Stats panel should be visible
    expect(screen.queryByText('项目看板')).not.toBeInTheDocument()

    const boardsTab = screen.getByRole('button', { name: /看板/i })
    fireEvent.click(boardsTab)

    // Boards should be visible again
    expect(screen.getByText('项目看板')).toBeInTheDocument()
  })

  it('should delete board with confirmation', async () => {
    global.confirm = vi.fn(() => true)
    mockDeleteBoard.mockResolvedValue(undefined)

    renderDashboard()

    // Find delete button (may need to adjust selector based on actual implementation)
    const deleteButtons = screen.getAllByRole('button', { name: /删除/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
      expect(mockDeleteBoard).toHaveBeenCalledWith('board-1')
    })
  })

  it('should not delete board when confirmation is cancelled', async () => {
    global.confirm = vi.fn(() => false)

    renderDashboard()

    const deleteButtons = screen.getAllByRole('button', { name: /删除/i })
    fireEvent.click(deleteButtons[0])

    await waitFor(() => {
      expect(global.confirm).toHaveBeenCalled()
    })

    expect(mockDeleteBoard).not.toHaveBeenCalled()
  })
})
