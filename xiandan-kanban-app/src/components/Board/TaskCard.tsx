import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  Calendar, 
  MessageCircle, 
  Bell, 
  MoreVertical, 
  Edit2, 
  Trash2,
  Clock
} from 'lucide-react';
import { Task } from '../../stores/taskStore';

interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onOpenDetails: (task: Task) => void;
}

const priorityColors = {
  low: 'bg-success-light text-success border-success',
  medium: 'bg-warning-light text-warning border-warning',
  high: 'bg-danger-light text-danger border-danger',
};

const priorityLabels = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
};

export const TaskCard = ({ task, onEdit, onDelete, onOpenDetails }: TaskCardProps) => {
  const [showMenu, setShowMenu] = useState(false);
  
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      role="button"
      tabIndex={0}
      className={`bg-white rounded-lg p-4 shadow-soft hover:shadow-medium transition-all cursor-move border border-neutral-200 hover:border-primary-300 group ${
        task.is_completed ? 'opacity-75' : ''
      }`}
      onClick={() => onOpenDetails(task)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <h3 className={`font-medium flex-1 pr-2 line-clamp-2 ${
          task.is_completed
            ? 'text-neutral-500 line-through'
            : 'text-neutral-900'
        }`}>
          {task.title}
        </h3>
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowMenu(!showMenu);
            }}
            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-neutral-100 rounded"
          >
            <MoreVertical className="w-4 h-4 text-neutral-500" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 top-8 bg-white rounded-lg shadow-large border border-neutral-200 py-1 z-10 min-w-[120px]">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
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
                  onDelete(task.id);
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

      {/* Description */}
      {task.description && (
        <p className="text-sm text-neutral-600 mb-3 line-clamp-2">
          {task.description}
        </p>
      )}

      {/* Priority Badge */}
      <div className="mb-3">
        <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium border ${priorityColors[task.priority]}`}>
          {priorityLabels[task.priority]}
        </span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <div className={`flex items-center gap-1 ${isOverdue ? 'text-danger' : ''}`}>
              <Calendar className="w-3.5 h-3.5" />
              {new Date(task.due_date).toLocaleDateString('en-US')}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1">
            <MessageCircle className="w-3.5 h-3.5" />
            <span>0</span>
          </div>
          <div className="flex items-center gap-1">
            <Bell className="w-3.5 h-3.5" />
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Status Indicator */}
      <div className="mt-3 pt-3 border-t border-neutral-100">
        <div className="flex items-center gap-2 text-xs">
          <Clock className="w-3.5 h-3.5 text-neutral-400" />
          <span className="text-neutral-500">
            Created on {new Date(task.created_at).toLocaleDateString('en-US')}
          </span>
        </div>
      </div>
    </div>
  );
};
