import { useState, useEffect } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import { Plus, ArrowLeft } from 'lucide-react';
import { useParams, useNavigate } from 'react-router-dom';
import { Column } from './Column';
import { TaskCard } from './TaskCard';
import { useBoardStore, Column as ColumnType } from '../../stores/boardStore';
import { useTaskStore, Task } from '../../stores/taskStore';
import { CreateColumnModal } from './CreateColumnModal';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailModal } from './TaskDetailModal';

export const BoardView = () => {
  const { boardId } = useParams<{ boardId: string }>();
  const navigate = useNavigate();
  const { boards, columns, fetchBoard, fetchColumns, deleteColumn, subscribeToColumns, unsubscribeFromColumns, loading } = useBoardStore();
  const { tasks, fetchAllTasksForBoard, moveTask, deleteTask, subscribeToTasks, unsubscribeFromTasks } = useTaskStore();

  const [showColumnModal, setShowColumnModal] = useState(false);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showTaskDetail, setShowTaskDetail] = useState(false);
  const [editingColumn, setEditingColumn] = useState<ColumnType | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedColumnId, setSelectedColumnId] = useState<string>('');
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [isFetchingBoard, setIsFetchingBoard] = useState(false);

  const board = boards.find(b => b.id === boardId);
  const boardColumns = columns.filter(c => c.board_id === boardId);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  useEffect(() => {
    if (boardId) {
      // Fetch the board if it's not already in the store
      const board = boards.find(b => b.id === boardId);
      if (!board) {
        setIsFetchingBoard(true);
        fetchBoard(boardId).finally(() => setIsFetchingBoard(false));
      }

      // Fetch columns and set up realtime subscription
      fetchColumns(boardId);
      subscribeToColumns(boardId);

      // Fetch all tasks for the board at once
      fetchAllTasksForBoard(boardId);
      subscribeToTasks(boardId);
    }
    return () => {
      unsubscribeFromColumns();
      unsubscribeFromTasks();
    };
  }, [boardId]);

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find(t => t.id === event.active.id);
    setActiveTask(task || null);
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over || active.id === over.id) return;

    const activeTask = tasks.find(t => t.id === active.id);
    const overTask = tasks.find(t => t.id === over.id);
    const overColumn = boardColumns.find(c => c.id === over.id);

    if (!activeTask) return;

    // Moving to a different column
    if (overColumn) {
      const newPosition = tasks.filter(t => t.column_id === overColumn.id).length;
      await moveTask(activeTask.id, overColumn.id, newPosition);
    }
    // Reordering within same column or moving between columns
    else if (overTask) {
      const activeColumnId = activeTask.column_id;
      const overColumnId = overTask.column_id;

      if (activeColumnId === overColumnId) {
        // Reorder within same column
        const columnTasks = tasks.filter(t => t.column_id === activeColumnId);
        const oldIndex = columnTasks.findIndex(t => t.id === active.id);
        const newIndex = columnTasks.findIndex(t => t.id === over.id);
        
        const reorderedTasks = arrayMove(columnTasks, oldIndex, newIndex);
        // Update positions in backend
        await moveTask(activeTask.id, activeColumnId, newIndex);
      } else {
        // Move to different column
        await moveTask(activeTask.id, overColumnId, overTask.position);
      }
    }
  };

  const handleCreateColumn = () => {
    setEditingColumn(null);
    setShowColumnModal(true);
  };

  const handleEditColumn = (column: ColumnType) => {
    setEditingColumn(column);
    setShowColumnModal(true);
  };

  const handleDeleteColumn = async (columnId: string) => {
    if (window.confirm('确定要删除此列吗？列中的所有任务也会被删除。')) {
      await deleteColumn(columnId);
    }
  };

  const handleCreateTask = (columnId: string) => {
    setSelectedColumnId(columnId);
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setSelectedColumnId(task.column_id);
    setShowTaskModal(true);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('确定要删除此任务吗？')) {
      await deleteTask(taskId);
    }
  };

  const handleOpenTaskDetails = (task: Task) => {
    setSelectedTask(task);
    setShowTaskDetail(true);
  };

  // Show loading state while fetching board
  if (!board && isFetchingBoard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-neutral-600">加载中...</p>
        </div>
      </div>
    );
  }

  // Show error state if board not found after fetching
  if (!board && !isFetchingBoard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-neutral-600 mb-4">看板不存在</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="text-primary-500 hover:text-primary-600"
          >
            返回仪表板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary-50 to-secondary-50">
      {/* Header */}
      <div className="bg-white shadow-soft border-b border-neutral-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 hover:bg-neutral-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-neutral-900">{board.name}</h1>
              {board.description && (
                <p className="text-sm text-neutral-600 mt-1">{board.description}</p>
              )}
            </div>
          </div>
          
          <button
            onClick={handleCreateColumn}
            className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-soft"
          >
            <Plus className="w-5 h-5" />
            添加列
          </button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
          <div className="flex gap-4 h-full">
            {boardColumns.map((column) => (
              <Column
                key={column.id}
                column={column}
                onEditColumn={handleEditColumn}
                onDeleteColumn={handleDeleteColumn}
                onCreateTask={handleCreateTask}
                onEditTask={handleEditTask}
                onDeleteTask={handleDeleteTask}
                onOpenTaskDetails={handleOpenTaskDetails}
              />
            ))}
            
            {boardColumns.length === 0 && (
              <div className="flex items-center justify-center w-full">
                <div className="text-center">
                  <p className="text-neutral-500 mb-4">还没有列，开始创建第一个列吧</p>
                  <button
                    onClick={handleCreateColumn}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors mx-auto"
                  >
                    <Plus className="w-5 h-5" />
                    创建列
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <DragOverlay>
            {activeTask ? (
              <div className="opacity-80">
                <TaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onOpenDetails={() => {}}
                />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Modals */}
      {showColumnModal && (
        <CreateColumnModal
          boardId={boardId!}
          column={editingColumn}
          onClose={() => {
            setShowColumnModal(false);
            setEditingColumn(null);
          }}
        />
      )}
      
      {showTaskModal && (
        <CreateTaskModal
          boardId={boardId!}
          columnId={selectedColumnId}
          task={editingTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
        />
      )}
      
      {showTaskDetail && selectedTask && (
        <TaskDetailModal
          task={selectedTask}
          onClose={() => {
            setShowTaskDetail(false);
            setSelectedTask(null);
          }}
        />
      )}
    </div>
  );
};
