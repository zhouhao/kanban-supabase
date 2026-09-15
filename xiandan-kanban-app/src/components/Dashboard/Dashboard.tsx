import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  LogOut, 
  LayoutGrid, 
  BarChart3,
  Settings,
  User
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBoardStore, Board } from '../../stores/boardStore';
import { CreateBoardModal } from './CreateBoardModal';
import { StatsPanel } from './StatsPanel';

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuthStore();
  const { boards, fetchBoards } = useBoardStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingBoard, setEditingBoard] = useState<Board | null>(null);
  const [activeTab, setActiveTab] = useState<'boards' | 'stats'>('boards');

  useEffect(() => {
    document.title = 'Dashboard - Xiandan Kanban';
  }, []);

  useEffect(() => {
    if (user) {
      fetchBoards(user.id);
    }
  }, [user, fetchBoards]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-secondary-50 to-primary-100">
      {/* Header */}
      <header className="bg-white shadow-soft border-b border-neutral-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-500 rounded-lg flex items-center justify-center">
                <LayoutGrid className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-neutral-900">Xiandan Kanban</h1>
                <p className="text-sm text-neutral-600">Kanban Management Tool</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-2 bg-neutral-50 rounded-lg">
                <User className="w-4 h-4 text-neutral-600" />
                <span className="text-sm text-neutral-700">{user?.email}</span>
              </div>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-2 px-4 py-2 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => setActiveTab('boards')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'boards'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
            My Boards
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'stats'
                ? 'bg-primary-500 text-white shadow-soft'
                : 'bg-white text-neutral-600 hover:bg-neutral-50'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            Statistics
          </button>
        </div>

        {/* Boards Tab */}
        {activeTab === 'boards' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-neutral-900">
                My Boards ({boards.length})
              </h2>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors shadow-soft hover:shadow-medium"
              >
                <Plus className="w-5 h-5" />
                Create Board
              </button>
            </div>

            {/* Boards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {boards.map((board) => (
                <div
                  key={board.id}
                  role="button"
                  tabIndex={0}
                  className="bg-white rounded-xl p-6 shadow-soft hover:shadow-medium transition-all cursor-pointer border border-neutral-200 hover:border-primary-300 group"
                  onClick={() => navigate(`/board/${board.id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-neutral-900 group-hover:text-primary-600 transition-colors">
                      {board.name}
                    </h3>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingBoard(board);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-neutral-100 rounded transition-all"
                      aria-label="Edit board"
                    >
                      <Settings className="w-4 h-4 text-neutral-500 hover:text-primary-600" />
                    </button>
                  </div>
                  
                  {board.description && (
                    <p className="text-sm text-neutral-600 mb-4 line-clamp-2">
                      {board.description}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-neutral-500">
                    <span>
                      Created on {new Date(board.created_at).toLocaleDateString('en-US')}
                    </span>
                  </div>
                </div>
              ))}

              {/* Empty State */}
              {boards.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center py-16">
                  <div className="w-20 h-20 bg-primary-100 rounded-full flex items-center justify-center mb-4">
                    <LayoutGrid className="w-10 h-10 text-primary-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 mb-2">
                    No Boards Yet
                  </h3>
                  <p className="text-neutral-600 mb-6 text-center max-w-md">
                    Create your first board to start managing tasks efficiently
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary-500 hover:bg-primary-600 text-white px-6 py-3 rounded-lg flex items-center gap-2 transition-colors shadow-soft"
                  >
                    <Plus className="w-5 h-5" />
                    Create First Board
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === 'stats' && (
          <StatsPanel />
        )}
      </main>

      {/* Create/Edit Board Modal */}
      {showCreateModal && (
        <CreateBoardModal onClose={() => setShowCreateModal(false)} />
      )}
      {editingBoard && (
        <CreateBoardModal board={editingBoard} onClose={() => setEditingBoard(null)} />
      )}
    </div>
  );
};
