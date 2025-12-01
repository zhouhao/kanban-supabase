import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
import type { Task } from '../../../stores/taskStore'

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

describe('TaskCard', () => {
  const mockTask: Task = {
    id: 'task-1',
    board_id: 'board-1',
    column_id: 'col-1',
    title: 'Test Task',
    description: 'Test Description',
    position: 0,
    priority: 'medium',
    due_date: null,
    start_date: null,
    assignee_id: null,
    creator_id: 'user-1',
    is_completed: false,
    is_deleted: false,
    completed_at: null,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockOnEdit = vi.fn()
  const mockOnDelete = vi.fn()
  const mockOnOpenDetails = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const renderTaskCard = (task: Task = mockTask) => {
    return render(
      <TaskCard
        task={task}
        onEdit={mockOnEdit}
        onDelete={mockOnDelete}
        onOpenDetails={mockOnOpenDetails}
      />
    )
  }

  it('should render task title and description', () => {
    renderTaskCard()

    expect(screen.getByText('Test Task')).toBeInTheDocument()
    expect(screen.getByText('Test Description')).toBeInTheDocument()
  })

  it('should display priority badge', () => {
    renderTaskCard()

    expect(screen.getByText('Medium')).toBeInTheDocument()
  })

  it('should show high priority badge for high priority task', () => {
    const highPriorityTask = { ...mockTask, priority: 'high' as const }
    renderTaskCard(highPriorityTask)

    expect(screen.getByText('High')).toBeInTheDocument()
  })

  it('should show low priority badge for low priority task', () => {
    const lowPriorityTask = { ...mockTask, priority: 'low' as const }
    renderTaskCard(lowPriorityTask)

    expect(screen.getByText('Low')).toBeInTheDocument()
  })

  it('should show completed styling for completed task', () => {
    const completedTask: Task = {
      ...mockTask,
      is_completed: true,
      completed_at: '2024-01-02T00:00:00Z',
    }

    renderTaskCard(completedTask)

    const title = screen.getByText('Test Task')
    expect(title).toHaveClass('line-through')
    expect(title).toHaveClass('text-neutral-500')
  })

  it('should call onOpenDetails when clicking on card', () => {
    renderTaskCard()

    const card = screen.getByText('Test Task').closest('div[role="button"]')
    fireEvent.click(card!)

    expect(mockOnOpenDetails).toHaveBeenCalledWith(mockTask)
  })

  it('should render edit and delete buttons in menu', () => {
    const { container } = renderTaskCard()

    // Menu button should be present
    const menuButtons = screen.getAllByRole('button', { name: '' })
    expect(menuButtons.length).toBeGreaterThan(0)

    // Click to show menu
    fireEvent.click(menuButtons[0])

    // Verify Edit and Delete text are in the document (in the menu)
    expect(container.textContent).toContain('Edit')
    expect(container.textContent).toContain('Delete')
  })

  it('should not show description if empty', () => {
    const taskWithoutDescription: Task = {
      ...mockTask,
      description: '',
    }

    renderTaskCard(taskWithoutDescription)

    expect(screen.queryByText('Test Description')).not.toBeInTheDocument()
  })
})
