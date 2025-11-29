import { useState, useEffect } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import { TaskCard } from './TaskCard';
import { Task, useTaskStore } from '../../stores/taskStore';
import { Column as ColumnType } from '../../stores/boardStore';

interface ColumnProps {
  column: ColumnType;
  onEditColumn: (column: ColumnType) => void;
  onDeleteColumn: (columnId: string) => void;
  onCreateTask: (columnId: string) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onOpenTaskDetails: (task: Task) => void;
}

export const Column = ({
  column,
  onEditColumn,
  onDeleteColumn,
  onCreateTask,
  onEditTask,
  onDeleteTask,
  onOpenTaskDetails,
}: ColumnProps) => {
  const [showMenu, setShowMenu] = useState(false);
  const { tasks, fetchTasks } = useTaskStore();
  const columnTasks = tasks.filter(task => task.column_id === column.id);

  const { setNodeRef } = useDroppable({
    id: column.id,
  });

  useEffect(() => {
    fetchTasks(column.id);
  }, [column.id]);

  return (
    <div className="bg-neutral-50 rounded-xl p-4 min-w-[320px] max-w-[320px] flex flex-col max-h-[calc(100vh-220px)]">
      {/* Column Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-neutral-900">{column.name}</h3>
          <span className="bg-neutral-200 text-neutral-600 text-xs font-medium px-2 py-0.5 rounded-full">
            {columnTasks.length}
          </span>
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 hover:bg-neutral-200 rounded transition-colors"
          >
            <MoreVertical className="w-4 h-4 text-neutral-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-large border border-neutral-200 py-1 z-10 min-w-[120px]">
              <button
                onClick={() => {
                  onEditColumn(column);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
              >
                <Edit2 className="w-4 h-4" />
                编辑
              </button>
              <button
                onClick={() => {
                  onDeleteColumn(column.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-danger"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Tasks List */}
      <div
        ref={setNodeRef}
        className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100"
      >
        <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {columnTasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onEdit={onEditTask}
              onDelete={onDeleteTask}
              onOpenDetails={onOpenTaskDetails}
            />
          ))}
        </SortableContext>
        
        {columnTasks.length === 0 && (
          <div className="text-center py-8 text-neutral-400 text-sm">
            暂无任务
          </div>
        )}
      </div>

      {/* Add Task Button */}
      <button
        onClick={() => onCreateTask(column.id)}
        className="mt-4 w-full bg-white hover:bg-neutral-50 border-2 border-dashed border-neutral-300 hover:border-primary-400 text-neutral-600 hover:text-primary-600 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
      >
        <Plus className="w-5 h-5" />
        添加任务
      </button>
    </div>
  );
};
