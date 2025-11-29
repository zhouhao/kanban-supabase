# "咸蛋快板"看板应用功能需求详细设计

## 目录
1. [项目概述](#项目概述)
2. [用户认证系统](#用户认证系统)
3. [看板与列管理](#看板与列管理)
4. [任务管理](#任务管理)
5. [邮件提醒系统](#邮件提醒系统)
6. [统计面板](#统计面板)
7. [技术实现方案](#技术实现方案)
8. [数据模型设计](#数据模型设计)

---

## 项目概述

### 产品定位
"咸蛋快板"是一个基于Web的看板管理应用，提供直观的可视化任务管理体验，支持多看板管理、任务拖拽、邮件提醒等功能。

### 核心价值
- 简洁直观的可视化界面
- 灵活的任务管理流程
- 自动化的邮件提醒机制
- 丰富的数据统计功能
- 良好的用户体验

### 技术架构
- 前端：React + TypeScript + Tailwind CSS + DnD Kit
- 后端：Supabase (PostgreSQL + Auth + Edge Functions)
- 部署：Vercel + Supabase云服务
- 邮件服务：Supabase Edge Functions + 第三方邮件API

---

## 1. 用户认证系统

### 功能描述
基于Supabase实现的邮箱认证系统，支持用户注册、登录、密码重置等功能。

### 业务流程图
```
用户访问 → 显示登录/注册页面 → 选择登录/注册
                                    ↓
注册流程：邮箱验证 → 创建用户资料 → 自动登录
                                    ↓
登录流程：邮箱验证 → 获取token → 跳转到主页
                                    ↓
密码重置：邮箱验证 → 重置密码 → 重新登录
```

### 功能需求

#### 1.1 用户注册
- **触发条件**: 新用户访问应用
- **输入要求**: 
  - 邮箱地址（必填，格式验证）
  - 密码（必填，8-50字符，包含字母数字）
  - 确认密码（必填，需与密码一致）
- **业务逻辑**:
  1. 表单验证（邮箱格式、密码强度）
  2. 调用Supabase注册接口
  3. 发送邮箱验证链接
  4. 等待用户点击验证链接
  5. 验证成功后创建默认看板
  6. 自动登录并跳转到主页
- **输出结果**: 用户成功注册并自动登录

#### 1.2 用户登录
- **触发条件**: 已注册用户访问应用
- **输入要求**:
  - 邮箱地址（必填）
  - 密码（必填）
- **业务逻辑**:
  1. 表单验证
  2. 调用Supabase登录接口
  3. 获取访问token和刷新token
  4. 存储token到本地存储
  5. 跳转到主页
- **输出结果**: 成功登录并跳转到应用主页

#### 1.3 密码重置
- **触发条件**: 用户点击"忘记密码"
- **输入要求**: 邮箱地址
- **业务逻辑**:
  1. 输入邮箱地址
  2. 调用Supabase密码重置接口
  3. 发送重置密码邮件
  4. 邮箱中的链接指向重置页面
  5. 设置新密码
- **输出结果**: 密码重置成功，可重新登录

#### 1.4 用户状态管理
- **功能**: 
  - 自动token刷新
  - 登录状态持久化
  - 退出登录清理token
- **实现方案**: 
  - 使用React Context + useAuth Hook
  - 自动检测token过期并刷新
  - 本地存储token和用户信息

### 数据模型
```sql
-- 用户信息表（Supabase Auth扩展）
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 用户偏好设置
CREATE TABLE user_preferences (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email_notifications BOOLEAN DEFAULT true,
  theme TEXT DEFAULT 'light',
  timezone TEXT DEFAULT 'Asia/Shanghai',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 2. 看板与列管理

### 功能描述
支持多看板管理，每个看板包含多个列（任务状态列），提供拖拽重排序功能。

### 业务流程图
```
用户进入 → 显示看板列表 → 选择看板 → 进入看板视图
                                      ↓
创建看板：设置名称/颜色 → 默认三列 → 看板创建完成
                                      ↓
管理列：添加列 → 设置列名称/颜色 → 保存列配置
                                      ↓
重排序：拖拽列 → 更新列顺序 → 保存新顺序
```

### 功能需求

#### 2.1 看板管理
- **创建看板**
  - 输入：看板名称、看板颜色、描述
  - 业务逻辑：
    1. 验证看板名称非空
    2. 创建看板记录
    3. 创建默认三列（待办、进行中、已完成）
    4. 分配看板权限给创建者
  - 输出：新看板及其默认列

- **编辑看板**
  - 输入：看板名称、描述、颜色
  - 业务逻辑：
    1. 验证修改权限
    2. 更新看板信息
    3. 同步更新缓存
  - 输出：更新后的看板信息

- **删除看板**
  - 输入：确认删除操作
  - 业务逻辑：
    1. 检查是否有权限
    2. 检查看板是否为空（无任务）
    3. 删除看板及其相关数据
  - 输出：看板删除成功

- **看板列表**
  - 功能：显示用户的所有看板
  - 排序：按创建时间倒序
  - 交互：点击进入看板详情

#### 2.2 列管理
- **默认列设置**
  - 自动创建三列：待办(Todo)、进行中(In Progress)、已完成(Done)
  - 每列有默认颜色和排序

- **添加自定义列**
  - 输入：列名称、列颜色、描述
  - 业务逻辑：
    1. 验证列名称唯一性
    2. 创建新列记录
    3. 更新列排序
  - 输出：新列添加到看板

- **编辑列信息**
  - 输入：列名称、颜色、描述
  - 业务逻辑：
    1. 验证权限
    2. 更新列信息
    3. 同步到所有客户端
  - 输出：列信息更新成功

- **删除列**
  - 输入：确认删除
  - 业务逻辑：
    1. 检查列是否为空
    2. 确认删除操作
    3. 删除列并重新排序
  - 输出：列删除成功

- **列重排序**
  - 功能：通过拖拽调整列顺序
  - 实现：使用DnD Kit实现拖拽排序
  - 业务逻辑：
    1. 捕获拖拽事件
    2. 更新列顺序数组
    3. 批量更新数据库
    4. 同步到其他客户端

### 数据模型
```sql
-- 看板表
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 列配置表
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  description TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 看板共享表（支持多用户）
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);
```

---

## 3. 任务管理

### 功能描述
完整的任务CRUD操作，支持拖拽移动，任务提醒设置等核心功能。

### 业务流程图
```
用户进入看板 → 显示任务列表 → 任务操作
                                    ↓
创建任务：填写表单 → 选择列 → 创建任务 → 显示在对应列
                                    ↓
编辑任务：点击编辑 → 修改信息 → 保存变更 → 更新显示
                                    ↓
移动任务：拖拽到目标列 → 更新状态 → 自动保存
                                    ↓
删除任务：确认删除 → 移除任务 → 更新统计
```

### 功能需求

#### 3.1 任务创建
- **触发条件**: 点击"添加任务"按钮
- **输入要求**:
  - 任务标题（必填，1-200字符）
  - 任务描述（可选，1-2000字符）
  - 优先级（低、中、高、紧急）
  - 截止日期（可选）
  - 标签（可选，多个标签）
  - 分配给（当前用户或协作成员）
- **业务逻辑**:
  1. 表单验证
  2. 创建任务记录
  3. 设置初始位置（列末尾）
  4. 触发通知（如果设定了提醒）
  5. 更新任务统计
- **输出结果**: 新任务显示在指定列中

#### 3.2 任务编辑
- **触发条件**: 点击任务卡片或编辑按钮
- **可编辑字段**: 
  - 标题、描述、优先级、截止日期
  - 标签、分配者、移动到其他列
- **业务逻辑**:
  1. 加载任务当前信息
  2. 编辑表单显示
  3. 实时保存变更
  4. 更新统计和提醒
- **输出结果**: 任务信息更新并重新渲染

#### 3.3 任务移动（拖拽）
- **功能**: 通过拖拽在不同列间移动任务
- **交互设计**:
  - 拖拽开始：任务卡片半透明显示
  - 拖拽过程：显示可放置区域
  - 拖拽完成：任务移动到新位置
- **业务逻辑**:
  1. 捕获拖拽开始事件
  2. 计算目标列和位置
  3. 更新任务列归属
  4. 重新计算任务排序
  5. 保存到数据库
  6. 同步到其他客户端
- **特殊情况处理**:
  - 跨看板移动：创建复制任务
  - 移动到被删除列：移动到默认列
  - 并发移动：使用乐观锁处理冲突

#### 3.4 任务删除
- **触发条件**: 点击删除按钮并确认
- **业务逻辑**:
  1. 确认删除提示
  2. 软删除（标记为已删除）
  3. 更新相关统计
  4. 取消相关提醒
- **输出结果**: 任务从界面移除

#### 3.5 任务提醒设置
- **提醒类型**:
  - 截止日期提醒
  - 开始日期提醒
  - 自定义时间提醒
- **提醒设置**:
  - 提前时间（15分钟、1小时、1天、1周）
  - 重复模式（一次性、每日、每周、每月）
  - 提醒方式（邮件、应用内通知）
- **业务逻辑**:
  1. 计算提醒时间点
  2. 创建提醒任务队列
  3. 定时检查并发送提醒
  4. 处理重复提醒逻辑

### 数据模型
```sql
-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  assignee_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  position INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务标签表
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提醒设置表
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'due_date', 'start_date', 'custom'
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  repeat_pattern TEXT, -- 'none', 'daily', 'weekly', 'monthly'
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 任务活动日志表
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'moved', 'deleted', 'completed'
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 4. 邮件提醒系统

### 功能描述
自动化的邮件提醒系统，支持定时发送、模板化邮件、个性化内容。

### 业务流程图
```
后台任务 → 检查提醒时间 → 生成邮件内容 → 发送邮件
                                           ↓
邮件模板：任务详情 → 提醒内容 → 个性化处理 → 格式化为HTML
                                           ↓
发送记录：记录发送状态 → 失败重试 → 成功确认
```

### 功能需求

#### 4.1 邮件模板管理
- **默认模板**:
  - 截止日期提醒邮件
  - 任务逾期提醒邮件
  - 每日任务总结邮件
  - 看板活动报告邮件

- **模板内容结构**:
  ```html
  <!DOCTYPE html>
  <html>
  <head>
      <title>{{email_title}}</title>
      <style>
          /* 邮件样式 */
      </style>
  </head>
  <body>
      <div class="container">
          <h2>{{greeting}}</h2>
          <p>{{user_name}}，您好！</p>
          
          <div class="content">
              {{email_content}}
          </div>
          
          <div class="footer">
              <p>此邮件来自咸蛋快板看板应用</p>
              <p><a href="{{app_url}}">打开应用</a></p>
          </div>
      </div>
  </body>
  </html>
  ```

- **模板变量**:
  - {{user_name}}: 用户姓名
  - {{email_title}}: 邮件标题
  - {{task_title}}: 任务标题
  - {{due_date}}: 截止日期
  - {{priority}}: 优先级
  - {{board_name}}: 看板名称
  - {{app_url}}: 应用链接

#### 4.2 定时提醒任务
- **任务调度机制**:
  - 使用Supabase Edge Functions实现定时任务
  - 每15分钟执行一次提醒检查
  - 数据库查询即将到期的提醒

- **检查逻辑**:
  ```sql
  -- 查询需要发送的提醒
  SELECT r.*, t.title, t.description, t.due_date, 
         t.priority, b.name as board_name,
         u.email, u.full_name
  FROM reminders r
  JOIN tasks t ON r.task_id = t.id
  JOIN boards b ON t.board_id = b.id
  JOIN auth.users u ON t.assignee_id = u.id
  WHERE r.is_sent = false 
    AND r.reminder_time <= NOW()
    AND t.is_deleted = false;
  ```

#### 4.3 邮件发送功能
- **发送流程**:
  1. 生成个性化邮件内容
  2. 调用邮件发送API
  3. 记录发送状态
  4. 处理发送失败重试

- **发送状态管理**:
  - pending: 待发送
  - sent: 发送成功
  - failed: 发送失败
  - retried: 重试中

#### 4.4 个性化邮件内容
- **截止日期提醒**:
  - 任务标题和描述
  - 剩余时间（倒计时）
  - 优先级标识
  - 快速操作链接

- **每日总结**:
  - 今日完成的任务数量
  - 待处理任务数量
  - 即将到期任务列表
  - 个人效率统计

### 实现方案

#### 4.1 Edge Function 实现
```typescript
// edge-function/email-reminders.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 查询待发送提醒
    const { data: reminders } = await supabase
      .from('reminders')
      .select(`
        *,
        tasks(*),
        tasks:tasks(
          title,
          description,
          due_date,
          priority,
          boards(name),
          assignee:assignee_id(email, full_name)
        )
      `)
      .eq('is_sent', false)
      .lte('reminder_time', new Date().toISOString())

    // 发送邮件
    for (const reminder of reminders) {
      await sendReminderEmail(reminder)
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
```

#### 4.2 邮件发送服务
- 使用第三方邮件服务（如Resend、SendGrid）
- 实现重试机制和错误处理
- 支持HTML和纯文本邮件格式

---

## 5. 统计面板

### 功能描述
提供看板内和全局的数据统计，帮助用户了解工作效率和任务进度。

### 业务流程图
```
数据收集 → 实时统计 → 缓存结果 → 显示图表
                                     ↓
用户查看：看板统计 → 任务完成率 → 时间趋势 → 效率分析
                                     ↓
全局统计：用户活动 → 协作效率 → 项目进度 → 数据导出
```

### 功能需求

#### 5.1 看板内统计
- **任务统计**:
  - 总任务数
  - 已完成任务数
  - 进行中任务数
  - 未开始任务数
  - 逾期任务数

- **完成率分析**:
  - 按列统计完成率
  - 按时间维度统计
  - 优先级完成情况
  - 个人任务完成率

- **时间分析**:
  - 任务平均完成时间
  - 各列任务平均停留时间
  - 任务创建和完成趋势图
  - 每日/每周活动热力图

#### 5.2 全局统计
- **用户统计**:
  - 注册用户总数
  - 活跃用户数（7天/30天）
  - 用户留存率
  - 用户注册趋势

- **看板统计**:
  - 总看板数
  - 平均每用户看板数
  - 看板使用频率
  - 最受欢迎的看板类型

- **任务统计**:
  - 全平台任务总数
  - 任务创建趋势
  - 任务完成趋势
  - 任务标签统计

#### 5.3 图表展示
- **柱状图**: 任务数量统计
- **折线图**: 时间趋势分析
- **饼图**: 优先级分布
- **热力图**: 活动时间分析
- **仪表盘**: 完成率展示

#### 5.4 数据导出
- **导出格式**: CSV、Excel、PDF
- **导出内容**: 
  - 任务清单
  - 统计报表
  - 活动日志
- **导出范围**: 按时间范围、看板范围

### 实现方案

#### 5.1 数据聚合查询
```sql
-- 看板任务统计
SELECT 
  c.name as column_name,
  COUNT(t.id) as task_count,
  COUNT(CASE WHEN t.is_completed THEN 1 END) as completed_count,
  AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_hours
FROM columns c
LEFT JOIN tasks t ON c.id = t.column_id
WHERE c.board_id = $1
GROUP BY c.id, c.name, c.position
ORDER BY c.position;

-- 时间趋势统计
SELECT 
  DATE_TRUNC('day', created_at) as date,
  COUNT(*) as created_tasks,
  COUNT(CASE WHEN is_completed THEN 1 END) as completed_tasks
FROM tasks
WHERE board_id = $1 
  AND created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', created_at)
ORDER BY date;
```

#### 5.2 缓存机制
- Redis缓存统计数据
- 定时更新缓存（每小时）
- 实时数据校验和更新

#### 5.3 实时更新
- 使用Supabase Realtime订阅数据变更
- 实时更新统计图表
- WebSocket推送更新通知

---

## 6. 技术实现方案

### 6.1 前端技术栈

#### 核心技术
- **React 18**: 使用函数组件和Hook
- **TypeScript**: 类型安全和开发体验
- **Vite**: 快速构建工具
- **Tailwind CSS**: 原子化CSS框架

#### 状态管理
```typescript
// 全局状态管理
interface AppState {
  user: User | null;
  currentBoard: Board | null;
  boards: Board[];
  tasks: Task[];
  columns: Column[];
  isLoading: boolean;
  error: string | null;
}

// Context Provider
const AppContext = createContext<AppState | null>(null);

function useAppState() {
  const context = useContext(AppContext);
  if (!context) throw new Error('useAppState must be used within AppProvider');
  return context;
}
```

#### UI组件库
- **@dnd-kit/core**: 拖拽功能
- **@dnd-kit/sortable**: 可排序列表
- **react-beautiful-dnd**: 替代拖拽方案
- **recharts**: 图表组件
- **react-hook-form**: 表单管理
- **date-fns**: 日期处理

#### 拖拽实现
```typescript
import { DndContext, DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

function KanbanBoard() {
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const task = tasks.find(t => t.id === taskId);
    setActiveTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;

    const taskId = active.id as string;
    const targetColumnId = over.id as string;

    // 移动任务到目标列
    moveTask(taskId, targetColumnId);
    setActiveTask(null);
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="kanban-board">
        {columns.map(column => (
          <SortableContext 
            key={column.id} 
            items={getTasksByColumn(column.id).map(t => t.id)}
            strategy={verticalListSortingStrategy}
          >
            <KanbanColumn column={column} />
          </SortableContext>
        ))}
      </div>
    </DndContext>
  );
}
```

### 6.2 后端技术栈

#### Supabase服务
- **PostgreSQL**: 主数据库
- **Auth**: 用户认证
- **Realtime**: 实时数据同步
- **Edge Functions**: 定时任务和邮件发送
- **Storage**: 文件存储（头像等）

#### 数据库设计
```sql
-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;

-- 创建索引优化查询
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_reminders_time ON reminders(reminder_time, is_sent);
```

#### RLS（行级安全）策略
```sql
-- 看板权限控制
CREATE POLICY "Users can view own boards" ON boards
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create boards" ON boards
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Board members can view boards" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );
```

### 6.3 部署方案

#### 开发环境
- **本地开发**: Supabase本地实例 + Vite开发服务器
- **代码管理**: Git + GitHub
- **开发工具**: VSCode + 相关扩展

#### 生产环境
- **前端部署**: Vercel
- **后端服务**: Supabase Cloud
- **域名**: 自定义域名配置
- **CDN**: Vercel自动CDN

#### CI/CD流程
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm install
      - name: Build
        run: npm run build
      - name: Deploy to Vercel
        uses: vercel/action@v1
```

### 6.4 性能优化

#### 前端优化
- **代码分割**: React.lazy + Suspense
- **虚拟滚动**: 大列表性能优化
- **图片懒加载**: 减少初始加载时间
- **状态优化**: 避免不必要的重渲染

#### 数据库优化
- **索引优化**: 针对查询模式创建索引
- **查询优化**: 减少N+1查询
- **分页**: 大量数据的分页加载
- **缓存**: Redis缓存热点数据

#### 实时性能
- **WebSocket连接池**: 管理连接数量
- **增量更新**: 只更新变更的数据
- **批量操作**: 减少网络请求次数

---

## 7. 数据模型设计

### 7.1 完整数据库结构

```sql
-- 用户配置表
CREATE TABLE user_profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 看板表
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 看板成员表
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member', -- 'owner', 'admin', 'member'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, user_id)
);

-- 列配置表
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280',
  description TEXT,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务表
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID REFERENCES columns(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  assignee_id UUID REFERENCES auth.users(id),
  creator_id UUID REFERENCES auth.users(id),
  position INTEGER NOT NULL DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 任务标签表
CREATE TABLE task_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 提醒设置表
CREATE TABLE reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'due_date', 'start_date', 'custom'
  reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
  repeat_pattern TEXT, -- 'none', 'daily', 'weekly', 'monthly'
  is_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  sent_at TIMESTAMP WITH TIME ZONE
);

-- 任务活动日志表
CREATE TABLE task_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id),
  action TEXT NOT NULL, -- 'created', 'updated', 'moved', 'deleted', 'completed'
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 邮件发送记录表
CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  template_name TEXT,
  reminder_id UUID REFERENCES reminders(id),
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX idx_boards_user_id ON boards(user_id);
CREATE INDEX idx_board_members_board_id ON board_members(board_id);
CREATE INDEX idx_board_members_user_id ON board_members(user_id);
CREATE INDEX idx_columns_board_id ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(board_id, position);
CREATE INDEX idx_tasks_board_id ON tasks(board_id);
CREATE INDEX idx_tasks_column_id ON tasks(column_id);
CREATE INDEX idx_tasks_assignee_id ON tasks(assignee_id);
CREATE INDEX idx_tasks_creator_id ON tasks(creator_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(is_completed, created_at);
CREATE INDEX idx_tasks_position ON tasks(board_id, column_id, position);
CREATE INDEX idx_task_tags_task_id ON task_tags(task_id);
CREATE INDEX idx_reminders_time ON reminders(reminder_time, is_sent);
CREATE INDEX idx_reminders_task_id ON reminders(task_id);
CREATE INDEX idx_task_activities_task_id ON task_activities(task_id);
CREATE INDEX idx_task_activities_user_id ON task_activities(user_id);
CREATE INDEX idx_email_logs_recipient ON email_logs(recipient_email, created_at);

-- 创建更新时间自动更新触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_profiles_updated_at 
  BEFORE UPDATE ON user_profiles 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_boards_updated_at 
  BEFORE UPDATE ON boards 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_columns_updated_at 
  BEFORE UPDATE ON columns 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at 
  BEFORE UPDATE ON tasks 
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 启用实时订阅
ALTER PUBLICATION supabase_realtime ADD TABLE boards;
ALTER PUBLICATION supabase_realtime ADD TABLE columns;
ALTER PUBLICATION supabase_realtime ADD TABLE tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE task_activities;
```

### 7.2 RLS策略配置

```sql
-- 用户配置表RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- 看板表RLS
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Board owners can manage boards" ON boards
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Board members can view boards" ON boards
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM board_members 
      WHERE board_id = boards.id AND user_id = auth.uid()
    )
  );

-- 列配置表RLS
ALTER TABLE columns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Column access based on board membership" ON columns
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = columns.board_id 
      AND (boards.user_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM board_members 
                  WHERE board_id = boards.id AND user_id = auth.uid()))
    )
  );

-- 任务表RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task access based on board membership" ON tasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM boards 
      WHERE boards.id = tasks.board_id 
      AND (boards.user_id = auth.uid() OR 
           EXISTS (SELECT 1 FROM board_members 
                  WHERE board_id = boards.id AND user_id = auth.uid()))
    )
  );

-- 其他表类似配置...
```

### 7.3 数据库视图

```sql
-- 看板详细统计视图
CREATE VIEW board_stats AS
SELECT 
  b.id as board_id,
  b.name as board_name,
  COUNT(DISTINCT t.id) as total_tasks,
  COUNT(DISTINCT CASE WHEN t.is_completed THEN 1 END) as completed_tasks,
  COUNT(DISTINCT CASE WHEN t.due_date < NOW() AND NOT t.is_completed THEN 1 END) as overdue_tasks,
  COUNT(DISTINCT CASE WHEN t.due_date BETWEEN NOW() AND NOW() + INTERVAL '7 days' AND NOT t.is_completed THEN 1 END) as due_soon_tasks,
  AVG(EXTRACT(EPOCH FROM (t.updated_at - t.created_at))/3600) as avg_completion_hours
FROM boards b
LEFT JOIN tasks t ON b.id = t.board_id AND t.is_deleted = false
GROUP BY b.id, b.name;

-- 用户活动统计视图
CREATE VIEW user_activity_stats AS
SELECT 
  u.id as user_id,
  u.full_name,
  COUNT(DISTINCT t.id) as total_tasks_created,
  COUNT(DISTINCT CASE WHEN t.is_completed THEN 1 END) as total_tasks_completed,
  COUNT(DISTINCT b.id) as total_boards,
  MAX(t.created_at) as last_activity
FROM auth.users u
LEFT JOIN tasks t ON u.id = t.creator_id
LEFT JOIN boards b ON u.id = b.user_id
GROUP BY u.id, u.full_name;
```

---

## 总结

本文档详细设计了"咸蛋快板"看板应用的完整功能架构，包括：

1. **用户认证系统**: 基于Supabase的安全认证方案
2. **看板与列管理**: 灵活的多看板管理机制
3. **任务管理**: 完整的CRUD操作和拖拽功能
4. **邮件提醒系统**: 智能化的定时提醒机制
5. **统计面板**: 多维度的数据分析和展示
6. **技术实现方案**: 详细的前后端技术栈和实现细节
7. **数据模型设计**: 完整的数据库结构和安全策略

整个设计注重用户体验、系统性能和可维护性，为开发团队提供了清晰的实现指导。

---

*文档版本: v1.0*  
*创建日期: 2025-11-29*  
*最后更新: 2025-11-29*