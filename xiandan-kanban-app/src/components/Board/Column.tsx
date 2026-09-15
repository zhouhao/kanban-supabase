import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, MoreVertical, Edit2, Trash2, GripVertical } from 'lucide-react';
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
  const { tasks } = useTaskStore();
  const columnTasks = tasks
    .filter(task => task.column_id === column.id)
    .sort((a, b) => a.position - b.position);

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: column.id,
  });

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `column-${column.id}`, data: { type: 'column' } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setSortableRef}
      style={style}
      className="rounded-xl overflow-hidden min-w-[480px] max-w-[480px] flex flex-col max-h-[calc(100vh-220px)]"
    >
      {/* Column Header with color */}
      <div
        className="px-4 py-3 mb-2 cursor-move"
        style={{ backgroundColor: column.color }}
        {...attributes}
        {...listeners}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GripVertical className="w-4 h-4 text-white text-opacity-70" />
            <h3 className="font-semibold text-white">{column.name}</h3>
            <span className="bg-white bg-opacity-30 text-white text-xs font-medium px-2 py-0.5 rounded-full">
              {columnTasks.length}
            </span>
          </div>

          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
            >
              <MoreVertical className="w-4 h-4 text-white" />
            </button>

          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-large border border-neutral-200 py-1 z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditColumn(column);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-neutral-700"
                aria-label="Edit"
              >
                <Edit2 className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteColumn(column.id);
                  setShowMenu(false);
                }}
                className="w-full px-4 py-2 text-left text-sm hover:bg-neutral-50 flex items-center gap-2 text-danger"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Tasks List */}
      <div className="bg-neutral-50 flex-1 p-4 pt-2 flex flex-col overflow-hidden">
        <div
          ref={setDroppableRef}
          className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin scrollbar-thumb-neutral-300 scrollbar-track-neutral-100 min-h-0"
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
            No tasks yet
          </div>
        )}
        </div>

        {/* Add Task Button */}
        <button
          onClick={() => onCreateTask(column.id)}
          className="mt-4 w-full bg-white hover:bg-neutral-50 border-2 border-dashed border-neutral-300 hover:border-primary-400 text-neutral-600 hover:text-primary-600 font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Add Task
        </button>
      </div>
    </div>
  );
};
