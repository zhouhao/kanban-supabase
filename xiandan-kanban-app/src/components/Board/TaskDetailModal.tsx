import { useState, useEffect } from 'react';
import { 
  X, 
  Calendar, 
  MessageCircle, 
  Bell, 
  Clock,
  Send,
  Plus,
  Trash2
} from 'lucide-react';
import { Task, useTaskStore } from '../../stores/taskStore';
import { useAuthStore } from '../../stores/authStore';

interface TaskDetailModalProps {
  task: Task;
  onClose: () => void;
}

const priorityColors = {
  low: 'bg-success-light text-success border-success',
  medium: 'bg-warning-light text-warning border-warning',
  high: 'bg-danger-light text-danger border-danger',
};

const priorityLabels = {
  low: '低',
  medium: '中',
  high: '高',
};

export const TaskDetailModal = ({ task, onClose }: TaskDetailModalProps) => {
  const { user } = useAuthStore();
  const { comments, reminders, fetchComments, fetchReminders, addComment, addReminder, deleteReminder } = useTaskStore();
  const [newComment, setNewComment] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [activeTab, setActiveTab] = useState<'comments' | 'reminders'>('comments');

  const taskComments = comments[task.id] || [];
  const taskReminders = reminders[task.id] || [];

  useEffect(() => {
    fetchComments(task.id);
    fetchReminders(task.id);
  }, [task.id]);

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    await addComment(task.id, newComment.trim(), user.id);
    setNewComment('');
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderTime || !user) return;

    await addReminder(task.id, user.id, reminderTime);
    setReminderTime('');
  };

  const handleDeleteReminder = async (reminderId: string) => {
    if (window.confirm('确定要删除此提醒吗？')) {
      await deleteReminder(reminderId);
    }
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-large max-w-3xl w-full max-h-[90vh] overflow-y-auto animate-fade-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-neutral-200 p-6 flex items-start justify-between">
          <div className="flex-1">
            <h2 className="text-2xl font-semibold text-neutral-900 mb-2">{task.title}</h2>
            <div className="flex items-center gap-3 flex-wrap">
              <span className={`inline-flex items-center px-3 py-1 rounded text-sm font-medium border ${priorityColors[task.priority]}`}>
                优先级: {priorityLabels[task.priority]}
              </span>
              {task.due_date && (
                <div className={`flex items-center gap-1 text-sm ${isOverdue ? 'text-danger' : 'text-neutral-600'}`}>
                  <Calendar className="w-4 h-4" />
                  截止: {new Date(task.due_date).toLocaleDateString('zh-CN')}
                  {isOverdue && <span className="ml-1 text-danger font-medium">(已逾期)</span>}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-neutral-100 rounded transition-colors"
          >
            <X className="w-5 h-5 text-neutral-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Description */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-neutral-700 mb-2">描述</h3>
            <p className="text-neutral-600 whitespace-pre-wrap">
              {task.description || '暂无描述'}
            </p>
          </div>

          {/* Metadata */}
          <div className="mb-6 p-4 bg-neutral-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-neutral-500">状态:</span>
                <span className="ml-2 text-neutral-900 font-medium">
                  {task.is_completed ? '已完成' : '进行中'}
                  
                  
                </span>
              </div>
              <div>
                <span className="text-neutral-500">创建时间:</span>
                <span className="ml-2 text-neutral-900">
                  {new Date(task.created_at).toLocaleString('zh-CN')}
                </span>
              </div>
              <div>
                <span className="text-neutral-500">更新时间:</span>
                <span className="ml-2 text-neutral-900">
                  {new Date(task.updated_at).toLocaleString('zh-CN')}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-neutral-200 mb-6">
            <div className="flex gap-4">
              <button
                onClick={() => setActiveTab('comments')}
                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'comments'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageCircle className="w-4 h-4" />
                  评论 ({taskComments.length})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('reminders')}
                className={`pb-3 px-2 font-medium border-b-2 transition-colors ${
                  activeTab === 'reminders'
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-neutral-600 hover:text-neutral-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  提醒 ({taskReminders.length})
                </div>
              </button>
            </div>
          </div>

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <div className="space-y-4 mb-6 max-h-60 overflow-y-auto">
                {taskComments.map((comment) => (
                  <div key={comment.id} className="bg-neutral-50 rounded-lg p-4">
                    <p className="text-neutral-900 mb-2">{comment.content}</p>
                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                      <Clock className="w-3 h-3" />
                      {new Date(comment.created_at).toLocaleString('zh-CN')}
                    </div>
                  </div>
                ))}
                {taskComments.length === 0 && (
                  <p className="text-center text-neutral-400 py-8">暂无评论</p>
                )}
              </div>

              <form onSubmit={handleAddComment} className="flex gap-2">
                <input
                  type="text"
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="添加评论..."
                />
                <button
                  type="submit"
                  disabled={!newComment.trim()}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          )}

          {/* Reminders Tab */}
          {activeTab === 'reminders' && (
            <div>
              <div className="space-y-3 mb-6 max-h-60 overflow-y-auto">
                {taskReminders.map((reminder) => (
                  <div key={reminder.id} className="bg-neutral-50 rounded-lg p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Bell className="w-4 h-4 text-primary-500" />
                      <div>
                        <p className="text-neutral-900 font-medium">
                          {new Date(reminder.reminder_time).toLocaleString('zh-CN')}
                        </p>
                        <p className="text-xs text-neutral-500">
                          {reminder.is_sent ? '已发送' : '待发送'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteReminder(reminder.id)}
                      className="p-2 hover:bg-danger-light rounded transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-danger" />
                    </button>
                  </div>
                ))}
                {taskReminders.length === 0 && (
                  <p className="text-center text-neutral-400 py-8">暂无提醒</p>
                )}
              </div>

              <form onSubmit={handleAddReminder} className="flex gap-2">
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="flex-1 px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  disabled={!reminderTime}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-3 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  添加
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
