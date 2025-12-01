import { useEffect, useState, useCallback } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase.ts';
import { useAuthStore } from '@/stores/authStore.ts';

interface TaskStats {
  total: number;
  completed: number;
  inProgress: number;
  overdue: number;
}

interface PriorityStats {
  high: number;
  medium: number;
  low: number;
}

interface BoardStats {
  id: string;
  name: string;
  taskCount: number;
}

const COLORS = {
  completed: '#10B981',
  inProgress: '#3B82F6',
  overdue: '#EF4444',
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#10B981',
};

export const StatsPanel = () => {
  const { user } = useAuthStore();
  const [taskStats, setTaskStats] = useState<TaskStats>({
    total: 0,
    completed: 0,
    inProgress: 0,
    overdue: 0,
  });
  const [priorityStats, setPriorityStats] = useState<PriorityStats>({
    high: 0,
    medium: 0,
    low: 0,
  });
  const [boardStats, setBoardStats] = useState<BoardStats[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Get all user's boards
      const { data: boards } = await supabase
        .from('boards')
        .select('id, name')
        .eq('user_id', user.id);

      if (!boards || boards.length === 0) {
        setLoading(false);
        return;
      }

      const boardIds = boards.map(b => b.id);

      // Get all tasks
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .in('board_id', boardIds)
        .eq('is_deleted', false);

      if (tasks) {
        const now = new Date();
        
        // Task status statistics
        const completed = tasks.filter(t => t.is_completed).length;
        const inProgress = tasks.filter(t => !t.is_completed).length;
        const overdue = tasks.filter(t => 
          !t.is_completed && t.due_date && new Date(t.due_date) < now
        ).length;

        setTaskStats({
          total: tasks.length,
          completed,
          inProgress,
          overdue,
        });

        // Priority statistics
        const high = tasks.filter(t => t.priority === 'high' && !t.is_completed).length;
        const medium = tasks.filter(t => t.priority === 'medium' && !t.is_completed).length;
        const low = tasks.filter(t => t.priority === 'low' && !t.is_completed).length;

        setPriorityStats({ high, medium, low });

        // Task count statistics for each board
        const boardTaskCounts = boards.map(board => ({
          id: board.id,
          name: board.name,
          taskCount: tasks.filter(t => t.board_id === board.id).length,
        }));

        setBoardStats(boardTaskCounts);
      }
    } catch (error) {
      console.error('Failed to fetch statistics:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user, fetchStats]);

  const statusData = [
    { name: 'Completed', value: taskStats.completed, color: COLORS.completed },
    { name: 'In Progress', value: taskStats.inProgress, color: COLORS.inProgress },
    { name: 'Overdue', value: taskStats.overdue, color: COLORS.overdue },
  ].filter(item => item.value > 0);

  const priorityData = [
    { name: 'High', value: priorityStats.high, fill: COLORS.high },
    { name: 'Medium', value: priorityStats.medium, fill: COLORS.medium },
    { name: 'Low', value: priorityStats.low, fill: COLORS.low },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">Loading statistics...</p>
        </div>
      </div>
    );
  }

  if (taskStats.total === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          No Data
        </h3>
        <p className="text-neutral-600">
          Statistics will be displayed here after creating boards and adding tasks
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Total Tasks</p>
              <p className="text-3xl font-bold text-neutral-900">{taskStats.total}</p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-primary-500" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Completed</p>
              <p className="text-3xl font-bold text-green-600">{taskStats.completed}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-neutral-100 rounded-full h-2">
              <div 
                className="bg-green-600 h-2 rounded-full transition-all"
                style={{ width: `${taskStats.total > 0 ? (taskStats.completed / taskStats.total * 100) : 0}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">In Progress</p>
              <p className="text-3xl font-bold text-blue-600">{taskStats.inProgress}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">Overdue</p>
              <p className="text-3xl font-bold text-red-600">{taskStats.overdue}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Distribution */}
        {statusData.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Task Status Distribution</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: any) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Priority Distribution */}
        {priorityData.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">Pending Task Priority</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#0087FF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Board Task Distribution */}
      {boardStats.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">Task Count by Board</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={boardStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="taskCount" fill="#0087FF" name="Task Count" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
