import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useBoardStore, Column } from '../../stores/boardStore';

interface CreateColumnModalProps {
  boardId: string;
  column?: Column | null;
  onClose: () => void;
}

export const CreateColumnModal = ({ boardId, column, onClose }: CreateColumnModalProps) => {
  const { createColumn, updateColumn, loading } = useBoardStore();
  const [name, setName] = useState('');
  const [color, setColor] = useState('#6B7280');
  const [error, setError] = useState('');

  useEffect(() => {
    if (column) {
      setName(column.name);
      setColor(column.color);
    }
  }, [column]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter column name');
      return;
    }

    if (column) {
      // Update existing column
      await updateColumn(column.id, { name: name.trim(), color });
    } else {
      // Create new column
      const result = await createColumn({
        board_id: boardId,
        name: name.trim(),
        color,
        position: 0, // Will be adjusted by backend
      });
      
      if (!result) {
        setError('Failed to create column');
        return;
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-large max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">
            {column ? 'Edit Column' : 'Create New Column'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Column Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="e.g., To Do, In Progress, Done"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {['#3B82F6', '#F59E0B', '#10B981', '#EF4444', '#8B5CF6', '#EC4899', '#6B7280', '#14B8A6'].map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-10 h-10 rounded-lg border-2 transition-all ${
                    color === c ? 'border-neutral-900 scale-110' : 'border-neutral-300 hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  disabled={loading}
                />
              ))}
            </div>
          </div>

          {error && (
            <div className="bg-danger-light border border-danger text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-neutral-200 text-neutral-700 rounded-lg hover:bg-neutral-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 bg-primary-500 hover:bg-primary-600 text-white px-4 py-3 rounded-lg transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {column ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{column ? 'Update Column' : 'Create Column'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
