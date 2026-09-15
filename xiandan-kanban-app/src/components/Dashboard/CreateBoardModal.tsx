import { useState, useEffect } from 'react';
import { X, Loader2 } from 'lucide-react';
import { useBoardStore, Board } from '../../stores/boardStore';
import { useAuthStore } from '../../stores/authStore';

interface CreateBoardModalProps {
  board?: Board | null;
  onClose: () => void;
}

export const CreateBoardModal = ({ board, onClose }: CreateBoardModalProps) => {
  const { user } = useAuthStore();
  const { createBoard, updateBoard, deleteBoard, loading } = useBoardStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (board) {
      setName(board.name);
      setDescription(board.description || '');
    }
  }, [board]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter board name');
      return;
    }

    if (board) {
      // Update existing board
      await updateBoard(board.id, {
        name: name.trim(),
        description: description.trim() || null,
      });
      onClose();
      return;
    }

    if (!user) {
      setError('User not logged in');
      return;
    }

    const result = await createBoard({
      name: name.trim(),
      description: description.trim() || null,
      user_id: user.id,
    });

    if (result) {
      onClose();
    } else {
      setError('Failed to create board');
    }
  };

  const handleDelete = async () => {
    if (!board) return;
    if (window.confirm(`Are you sure you want to delete the board "${board.name}"? This action cannot be undone.`)) {
      await deleteBoard(board.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-large max-w-md w-full p-6 animate-fade-in">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-neutral-900">
            {board ? 'Edit Board' : 'Create New Board'}
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
              Board Name <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              placeholder="e.g., Product Development"
              disabled={loading}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all resize-none"
              placeholder="Briefly describe the purpose of this board"
              rows={3}
              disabled={loading}
            />
          </div>

          {error && (
            <div className="bg-danger-light border border-danger text-danger px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            {board && (
              <button
                type="button"
                onClick={handleDelete}
                className="px-4 py-3 border border-danger text-danger rounded-lg hover:bg-danger-light transition-colors font-medium"
                disabled={loading}
              >
                Delete
              </button>
            )}
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
                  {board ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>{board ? 'Update Board' : 'Create Board'}</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
