import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Column } from '../Column'
import type { Column as ColumnType } from '../../../stores/boardStore'
import type { Task } from '../../../stores/taskStore'
import { useTaskStore } from '../../../stores/taskStore'

// Mock the task store
vi.mock('../../../stores/taskStore', () => ({
  useTaskStore: vi.fn(),
}))

// Mock @dnd-kit/core
vi.mock('@dnd-kit/core', () => ({
  useDroppable: () => ({
    setNodeRef: vi.fn(),
    isOver: false,
  }),
}))

// Mock @dnd-kit/sortable
vi.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: any) => children,
  verticalListSortingStrategy: {},
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: null,
    isDragging: false,
  }),
}))

describe('Column', () => {
  const mockColumn: ColumnType = {
    id: 'col-1',
    board_id: 'board-1',
    name: 'Todo',
    color: '#3B82F6',
    position: 0,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  }

  const mockTasks: Task[] = [
    {
      id: 'task-1',
      board_id: 'board-1',
      column_id: 'col-1',
      title: 'Task 1',
      description: 'Description 1',
      position: 0,
      priority: 'high',
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
      description: 'Description 2',
      position: 1,
      priority: 'medium',
      due_date: null,
      is_completed: false,
      completed_at: null,
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
    },
  ]

  const mockOnEditColumn = vi.fn()
  const mockOnDeleteColumn = vi.fn()
  const mockOnCreateTask = vi.fn()
  const mockOnEditTask = vi.fn()
  const mockOnDeleteTask = vi.fn()
  const mockOnOpenTaskDetails = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()

    vi.mocked(useTaskStore).mockReturnValue({
      tasks: mockTasks,
    } as any)
  })

  const renderColumn = (column: ColumnType = mockColumn) => {
    return render(
      <Column
        column={column}
        onEditColumn={mockOnEditColumn}
        onDeleteColumn={mockOnDeleteColumn}
        onCreateTask={mockOnCreateTask}
        onEditTask={mockOnEditTask}
        onDeleteTask={mockOnDeleteTask}
        onOpenTaskDetails={mockOnOpenTaskDetails}
      />
    )
  }

  it('should render column header with name and color', () => {
    const { container } = renderColumn()

    expect(screen.getByText('Todo')).toBeInTheDocument()

    // Find the div with inline style backgroundColor
    const header = container.querySelector('[style*="background-color"]') as HTMLElement
    expect(header).toHaveStyle({ backgroundColor: 'rgb(59, 130, 246)' })
  })

  it('should render task count badge', () => {
    renderColumn()

    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('should render all tasks in the column', () => {
    renderColumn()

    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
  })

  it('should show empty state when no tasks', () => {
    vi.mocked(useTaskStore).mockReturnValue({
      tasks: [],
    } as any)

    renderColumn()

    expect(screen.getByText('No tasks yet')).toBeInTheDocument()
  })

  it('should call onCreateTask when clicking add task button', () => {
    renderColumn()

    const addButton = screen.getByRole('button', { name: /Add Task/i })
    fireEvent.click(addButton)

    expect(mockOnCreateTask).toHaveBeenCalledWith('col-1')
  })

  it('should call onEditColumn when clicking edit column button', () => {
    renderColumn()

    // First click the column menu button (first button with empty name in the column header)
    const menuButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(menuButtons[0])

    // Then click the edit button
    const editButtons = screen.getAllByRole('button', { name: /Edit/i })
    fireEvent.click(editButtons[0])

    expect(mockOnEditColumn).toHaveBeenCalledWith(mockColumn)
  })

  it('should call onDeleteColumn when clicking delete column button', () => {
    renderColumn()

    // First click the column menu button (first button with empty name in the column header)
    const menuButtons = screen.getAllByRole('button', { name: '' })
    fireEvent.click(menuButtons[0])

    // Then click the delete button
    const deleteButtons = screen.getAllByRole('button', { name: /Delete/i })
    fireEvent.click(deleteButtons[0])

    expect(mockOnDeleteColumn).toHaveBeenCalledWith('col-1')
  })

  it('should render tasks sorted by position', () => {
    const unsortedTasks: Task[] = [
      { ...mockTasks[1], position: 1 },
      { ...mockTasks[0], position: 0 },
    ]

    vi.mocked(useTaskStore).mockReturnValue({
      tasks: unsortedTasks,
    } as any)

    renderColumn()

    const taskElements = screen.getAllByText(/Task \d/)
    expect(taskElements[0]).toHaveTextContent('Task 1')
    expect(taskElements[1]).toHaveTextContent('Task 2')
  })

  it('should only show tasks for this column', () => {
    const tasksFromMultipleColumns: Task[] = [
      ...mockTasks,
      {
        ...mockTasks[0],
        id: 'task-3',
        column_id: 'col-2',
        title: 'Task from other column',
      },
    ]

    vi.mocked(useTaskStore).mockReturnValue({
      tasks: tasksFromMultipleColumns,
    } as any)

    renderColumn()

    expect(screen.getByText('Task 1')).toBeInTheDocument()
    expect(screen.getByText('Task 2')).toBeInTheDocument()
    expect(screen.queryByText('Task from other column')).not.toBeInTheDocument()
  })

  it('should render column with custom color', () => {
    const greenColumn: ColumnType = {
      ...mockColumn,
      name: 'Done',
      color: '#10B981',
    }

    const { container } = renderColumn(greenColumn)

    const header = container.querySelector('[style*="background-color"]') as HTMLElement
    expect(header).toHaveStyle({ backgroundColor: 'rgb(16, 185, 129)' })
  })
})
