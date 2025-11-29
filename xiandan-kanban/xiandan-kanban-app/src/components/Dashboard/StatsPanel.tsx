import { useEffect, useState } from 'react';
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
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../stores/authStore';

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

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // 获取用户的所有看板
      const { data: boards } = await supabase
        .from('boards')
        .select('id, name')
        .eq('user_id', user.id);

      if (!boards || boards.length === 0) {
        setLoading(false);
        return;
      }

      const boardIds = boards.map(b => b.id);

      // 获取所有任务
      const { data: tasks } = await supabase
        .from('tasks')
        .select('*')
        .in('board_id', boardIds)
        .eq('is_deleted', false);

      if (tasks) {
        const now = new Date();
        
        // 任务状态统计
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

        // 优先级统计
        const high = tasks.filter(t => t.priority === 'high' && !t.is_completed).length;
        const medium = tasks.filter(t => t.priority === 'medium' && !t.is_completed).length;
        const low = tasks.filter(t => t.priority === 'low' && !t.is_completed).length;

        setPriorityStats({ high, medium, low });

        // 每个看板的任务数统计
        const boardTaskCounts = boards.map(board => ({
          id: board.id,
          name: board.name,
          taskCount: tasks.filter(t => t.board_id === board.id).length,
        }));

        setBoardStats(boardTaskCounts);
      }
    } catch (error) {
      console.error('获取统计数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const statusData = [
    { name: '已完成', value: taskStats.completed, color: COLORS.completed },
    { name: '进行中', value: taskStats.inProgress, color: COLORS.inProgress },
    { name: '已逾期', value: taskStats.overdue, color: COLORS.overdue },
  ].filter(item => item.value > 0);

  const priorityData = [
    { name: '高', value: priorityStats.high, fill: COLORS.high },
    { name: '中', value: priorityStats.medium, fill: COLORS.medium },
    { name: '低', value: priorityStats.low, fill: COLORS.low },
  ].filter(item => item.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-neutral-600">加载统计数据...</p>
        </div>
      </div>
    );
  }

  if (taskStats.total === 0) {
    return (
      <div className="text-center py-16">
        <AlertCircle className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-neutral-900 mb-2">
          暂无数据
        </h3>
        <p className="text-neutral-600">
          创建看板并添加任务后，这里将显示统计信息
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 概览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-600 mb-1">总任务</p>
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
              <p className="text-sm text-neutral-600 mb-1">已完成</p>
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
              <p className="text-sm text-neutral-600 mb-1">进行中</p>
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
              <p className="text-sm text-neutral-600 mb-1">已逾期</p>
              <p className="text-3xl font-bold text-red-600">{taskStats.overdue}</p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务状态分布 */}
        {statusData.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">任务状态分布</h3>
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

        {/* 优先级分布 */}
        {priorityData.length > 0 && (
          <div className="bg-white rounded-xl p-6 shadow-soft">
            <h3 className="text-lg font-semibold text-neutral-900 mb-4">待办任务优先级</h3>
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

      {/* 看板任务分布 */}
      {boardStats.length > 0 && (
        <div className="bg-white rounded-xl p-6 shadow-soft">
          <h3 className="text-lg font-semibold text-neutral-900 mb-4">各看板任务数量</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={boardStats}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="taskCount" fill="#0087FF" name="任务数" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
