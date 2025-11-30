import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    is_completed: false,
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

  it('should call onEdit when clicking edit button', () => {
    renderTaskCard()

    const editButton = screen.getByRole('button', { name: /Edit/i })
    fireEvent.click(editButton)

    expect(mockOnEdit).toHaveBeenCalledWith(mockTask)
    expect(mockOnOpenDetails).not.toHaveBeenCalled()
  })

  it('should call onDelete when clicking delete button', () => {
    renderTaskCard()

    const deleteButton = screen.getByRole('button', { name: /Delete/i })
    fireEvent.click(deleteButton)

    expect(mockOnDelete).toHaveBeenCalledWith(mockTask.id)
    expect(mockOnOpenDetails).not.toHaveBeenCalled()
  })

  it('should display due date when present', () => {
    const taskWithDueDate: Task = {
      ...mockTask,
      due_date: '2024-12-31',
    }

    renderTaskCard(taskWithDueDate)

    expect(screen.getByText(/2024/)).toBeInTheDocument()
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
