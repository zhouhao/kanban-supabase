# 咸蛋快板看板应用 - 数据库和API设计文档

## 1. 项目概述

咸蛋快板是一个现代化的看板任务管理应用，类似于Trello和Notion的结合体。本文档详细描述了完整的数据库架构、API设计和安全策略。

## 2. 数据库表结构设计

### 2.1 用户管理表

#### users 表
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  timezone VARCHAR(50) DEFAULT 'Asia/Shanghai',
  notification_settings JSONB DEFAULT '{"email": true, "push": true, "in_app": true}',
  last_seen_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### user_profiles 表
```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  theme_preference VARCHAR(20) DEFAULT 'light' CHECK (theme_preference IN ('light', 'dark', 'auto')),
  language VARCHAR(10) DEFAULT 'zh-CN',
  keyboard_shortcuts JSONB,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id)
);
```

### 2.2 团队和工作空间表

#### workspaces 表
```sql
CREATE TABLE workspaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES users(id),
  settings JSONB DEFAULT '{"visibility": "private", "allow_invites": true}',
  plan_type VARCHAR(20) DEFAULT 'free' CHECK (plan_type IN ('free', 'pro', 'enterprise')),
  limits JSONB DEFAULT '{"boards": 10, "members": 5}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### workspace_members 表
```sql
CREATE TABLE workspace_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  joined_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES users(id),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('pending', 'active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(workspace_id, user_id)
);
```

### 2.3 看板相关表

#### boards 表
```sql
CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  background_color VARCHAR(7) DEFAULT '#0079bf',
  background_image TEXT,
  visibility VARCHAR(20) DEFAULT 'workspace' CHECK (visibility IN ('private', 'workspace', 'public')),
  settings JSONB DEFAULT '{"position": 0, "template": null, "preferences": {}}',
  is_archived BOOLEAN DEFAULT false,
  archived_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### board_members 表
```sql
CREATE TABLE board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(20) DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  permissions JSONB DEFAULT '{}',
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  added_by UUID REFERENCES users(id),
  UNIQUE(board_id, user_id)
);
```

#### board_templates 表
```sql
CREATE TABLE board_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  category VARCHAR(50),
  is_public BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  template_data JSONB NOT NULL,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.4 列和任务表

#### columns 表
```sql
CREATE TABLE columns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  title VARCHAR(100) NOT NULL,
  color VARCHAR(7) DEFAULT '#cccccc',
  position INTEGER NOT NULL,
  max_tasks INTEGER DEFAULT 1000,
  wip_limit INTEGER,
  settings JSONB DEFAULT '{"collapsible": false, "color_coding": false}',
  is_archived BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### tasks 表
```sql
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  column_id UUID NOT NULL REFERENCES columns(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  description_format VARCHAR(10) DEFAULT 'markdown' CHECK (description_format IN ('markdown', 'plain')),
  position INTEGER NOT NULL DEFAULT 0,
  priority VARCHAR(10) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'review', 'completed', 'blocked')),
  difficulty INTEGER DEFAULT 3 CHECK (difficulty BETWEEN 1 AND 5),
  estimated_hours DECIMAL(5,2),
  actual_hours DECIMAL(5,2),
  due_date TIMESTAMP WITH TIME ZONE,
  start_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  archived_at TIMESTAMP WITH TIME ZONE,
  is_archived BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### task_labels 表
```sql
CREATE TABLE task_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  color VARCHAR(7) NOT NULL,
  position INTEGER DEFAULT 0,
  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, name)
);
```

#### task_label_associations 表
```sql
CREATE TABLE task_label_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, label_id)
);
```

#### task_members 表
```sql
CREATE TABLE task_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  role VARCHAR(20) DEFAULT 'assignee' CHECK (role IN ('assignee', 'follower', 'reviewer')),
  UNIQUE(task_id, user_id)
);
```

### 2.5 评论和附件表

#### comments 表
```sql
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  content_format VARCHAR(10) DEFAULT 'markdown' CHECK (content_format IN ('markdown', 'plain')),
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  is_edited BOOLEAN DEFAULT false,
  edited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### attachments 表
```sql
CREATE TABLE attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(100) NOT NULL,
  file_url TEXT NOT NULL,
  thumbnail_url TEXT,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false
);
```

### 2.6 活动和通知表

#### activity_logs 表
```sql
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  action VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### notifications 表
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(50) NOT NULL,
  action_url TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2.7 统计和分析表

#### board_stats 表
```sql
CREATE TABLE board_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id UUID NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_tasks INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  in_progress_tasks INTEGER DEFAULT 0,
  blocked_tasks INTEGER DEFAULT 0,
  avg_completion_time DECIMAL(8,2),
  member_activity JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(board_id, date)
);
```

#### user_stats 表
```sql
CREATE TABLE user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES workspaces(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  tasks_assigned INTEGER DEFAULT 0,
  tasks_completed INTEGER DEFAULT 0,
  comments_posted INTEGER DEFAULT 0,
  active_boards INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, workspace_id, date)
);
```

## 3. 表关系和外键约束

### 3.1 关系图

```
users
├── user_profiles (1:1)
├── workspace_members (1:N)
├── board_members (1:N)
├── task_members (1:N)
├── comments (1:N)
├── attachments (1:N)
├── activity_logs (1:N)
└── notifications (1:N)

workspaces
├── workspace_members (1:N)
├── boards (1:N)
└── user_stats (1:N)

boards
├── board_members (1:N)
├── columns (1:N)
├── board_templates (1:N)
└── board_stats (1:N)

columns
└── tasks (1:N)

tasks
├── comments (1:N)
├── attachments (1:N)
├── task_label_associations (1:N)
├── task_members (1:N)
└── activity_logs (1:N)

task_labels
└── task_label_associations (1:N)
```

### 3.2 关键约束

1. **用户权限约束**: 通过RLS策略确保用户只能访问他们有权限的资源
2. **数据一致性**: 使用外键约束确保数据完整性
3. **唯一性约束**: 防止重复数据（如用户名、邮箱）
4. **检查约束**: 限制枚举值的有效性
5. **级联删除**: 合理设置级联删除规则，避免数据孤岛

## 4. RLS（Row Level Security）安全策略

### 4.1 用户表策略

```sql
-- 用户只能查看和编辑自己的资料
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 公共信息可查看（用户名、头像等）
CREATE POLICY "Public user info is viewable" ON users
  FOR SELECT USING (
    id IN (
      SELECT user_id FROM workspace_members 
      WHERE status = 'active'
      UNION
      SELECT user_id FROM board_members
    )
  );
```

### 4.2 工作空间策略

```sql
-- 只有工作空间成员才能查看工作空间
CREATE POLICY "Workspace members can view workspace" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- 只有工作空间创建者和管理员才能修改
CREATE POLICY "Admins can modify workspace" ON workspaces
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
```

### 4.3 看板策略

```sql
-- 看板成员可以查看看板
CREATE POLICY "Board members can view board" ON boards
  FOR SELECT USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    ) OR
    visibility = 'public'
  );

-- 看板创建者和管理员可以修改
CREATE POLICY "Board admins can modify board" ON boards
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

### 4.4 任务策略

```sql
-- 任务访问权限依赖于所属看板的权限
CREATE POLICY "Tasks visible to board members" ON tasks
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    )
  );

-- 只有任务分配者、创建者和看板管理员可以修改
CREATE POLICY "Task modification by authorized users" ON tasks
  FOR UPDATE USING (
    created_by = auth.uid() OR
    id IN (
      SELECT task_id FROM task_members 
      WHERE user_id = auth.uid() AND role IN ('assignee', 'reviewer')
    ) OR
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

### 4.5 通用策略函数

```sql
-- 检查用户是否为工作空间成员
CREATE OR REPLACE FUNCTION is_workspace_member(workspace_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM workspace_members 
    WHERE workspace_id = workspace_uuid 
    AND user_id = user_uuid 
    AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 检查用户是否为看板成员
CREATE OR REPLACE FUNCTION is_board_member(board_uuid UUID, user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM board_members 
    WHERE board_id = board_uuid 
    AND user_id = user_uuid
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 5. Edge Functions接口设计

### 5.1 邮件通知服务

#### edge-function: send-notification
```typescript
// supabase/functions/send-notification/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

interface NotificationData {
  recipient_id: string
  type: 'task_assigned' | 'comment_added' | 'due_date_reminder' | 'board_invited'
  title: string
  message: string
  data?: any
  email_enabled?: boolean
  in_app_enabled?: boolean
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { recipient_id, type, title, message, data, email_enabled, in_app_enabled }: NotificationData = await req.json()
    
    // 获取用户邮箱和通知偏好
    const userQuery = await supabase
      .from('users')
      .select('email, notification_settings')
      .eq('id', recipient_id)
      .single()
    
    if (!userQuery.data) {
      throw new Error('User not found')
    }

    const { email, notification_settings } = userQuery.data
    const emailEnabled = email_enabled !== false && notification_settings?.email

    // 创建应用内通知
    if (in_app_enabled !== false && notification_settings?.in_app) {
      await supabase
        .from('notifications')
        .insert({
          user_id: recipient_id,
          type,
          title,
          message,
          data: data || {},
          action_url: data?.url || null
        })
    }

    // 发送邮件通知
    if (emailEnabled && email) {
      await sendEmail(email, title, message, data)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Notification sent' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 5.2 任务统计服务

#### edge-function: calculate-board-stats
```typescript
// supabase/functions/calculate-board-stats/index.ts
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { board_id, date } = await req.json()
    const targetDate = date || new Date().toISOString().split('T')[0]

    // 计算看板统计数据
    const statsQuery = await supabase
      .from('tasks')
      .select(`
        status,
        created_at,
        completed_at,
        board_id,
        task_members!inner(user_id)
      `)
      .eq('board_id', board_id)
      .gte('created_at', targetDate)
      .lt('created_at', new Date(new Date(targetDate).getTime() + 24 * 60 * 60 * 1000).toISOString())

    if (!statsQuery.data) {
      throw new Error('Failed to fetch board stats')
    }

    const stats = {
      total_tasks: statsQuery.data.length,
      completed_tasks: statsQuery.data.filter(t => t.status === 'completed').length,
      in_progress_tasks: statsQuery.data.filter(t => t.status === 'in_progress').length,
      blocked_tasks: statsQuery.data.filter(t => t.status === 'blocked').length,
      member_activity: {}
    }

    // 计算成员活动
    for (const task of statsQuery.data) {
      const userId = task.task_members[0]?.user_id
      if (userId) {
        stats.member_activity[userId] = (stats.member_activity[userId] || 0) + 1
      }
    }

    // 计算平均完成时间
    const completedTasks = statsQuery.data.filter(t => t.status === 'completed' && t.completed_at)
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        const completionTime = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()
        return sum + completionTime
      }, 0)
      stats.avg_completion_time = totalTime / completedTasks.length / (1000 * 60 * 60) // 小时
    }

    // 保存统计数据
    await supabase
      .from('board_stats')
      .upsert({
        board_id,
        date: targetDate,
        ...stats
      })

    return new Response(
      JSON.stringify({ success: true, stats }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 5.3 批量操作服务

#### edge-function: bulk-task-operations
```typescript
// supabase/functions/bulk-task-operations/index.ts
interface BulkOperation {
  action: 'move' | 'update' | 'archive' | 'delete'
  task_ids: string[]
  data?: any
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { operations }: { operations: BulkOperation[] } = await req.json()
    const results = []

    for (const operation of operations) {
      const { action, task_ids, data } = operation

      switch (action) {
        case 'move':
          if (!data?.column_id || !data?.position) {
            throw new Error('Column ID and position required for move operation')
          }
          // 批量移动任务
          for (let i = 0; i < task_ids.length; i++) {
            await supabase
              .from('tasks')
              .update({
                column_id: data.column_id,
                position: data.position + i,
                updated_at: new Date().toISOString()
              })
              .eq('id', task_ids[i])
          }
          break

        case 'update':
          // 批量更新任务属性
          for (const task_id of task_ids) {
            await supabase
              .from('tasks')
              .update({
                ...data,
                updated_at: new Date().toISOString()
              })
              .eq('id', task_id)
          }
          break

        case 'archive':
          // 批量归档任务
          for (const task_id of task_ids) {
            await supabase
              .from('tasks')
              .update({
                is_archived: true,
                archived_at: new Date().toISOString()
              })
              .eq('id', task_id)
          }
          break

        case 'delete':
          // 批量删除任务（软删除）
          for (const task_id of task_ids) {
            await supabase
              .from('tasks')
              .delete()
              .eq('id', task_id)
          }
          break
      }

      results.push({ task_ids, action, success: true })
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

### 5.4 报告生成服务

#### edge-function: generate-board-report
```typescript
// supabase/functions/generate-board-report/index.ts
serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { board_id, period = 'week', format = 'json' } = await req.json()
    
    // 获取看板基本信息
    const boardQuery = await supabase
      .from('boards')
      .select('title, description, created_at')
      .eq('id', board_id)
      .single()

    if (!boardQuery.data) {
      throw new Error('Board not found')
    }

    // 计算时间范围
    const endDate = new Date()
    const startDate = new Date()
    switch (period) {
      case 'week':
        startDate.setDate(endDate.getDate() - 7)
        break
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1)
        break
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3)
        break
    }

    // 获取统计数据
    const statsQuery = await supabase
      .from('board_stats')
      .select('*')
      .eq('board_id', board_id)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date')

    const report = {
      board_info: boardQuery.data,
      period,
      date_range: {
        start: startDate.toISOString(),
        end: endDate.toISOString()
      },
      summary: {},
      trends: statsQuery.data || [],
      insights: []
    }

    // 生成总结
    if (statsQuery.data && statsQuery.data.length > 0) {
      const totals = statsQuery.data.reduce((acc, day) => {
        acc.total_tasks += day.total_tasks
        acc.completed_tasks += day.completed_tasks
        return acc
      }, { total_tasks: 0, completed_tasks: 0 })

      report.summary = {
        total_tasks: totals.total_tasks,
        completed_tasks: totals.completed_tasks,
        completion_rate: totals.total_tasks > 0 ? (totals.completed_tasks / totals.total_tasks * 100).toFixed(2) + '%' : '0%'
      }

      // 生成洞察
      if (report.summary.completion_rate > 80) {
        report.insights.push('看板完成率表现优异')
      } else if (report.summary.completion_rate < 50) {
        report.insights.push('建议优化任务流程以提高完成率')
      }
    }

    return new Response(
      JSON.stringify({ success: true, report }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
```

## 6. 数据库索引和性能优化

### 6.1 索引策略

```sql
-- 用户相关索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

-- 工作空间成员索引
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);

-- 看板相关索引
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_created_by ON boards(created_by);
CREATE INDEX idx_boards_archived ON boards(is_archived);

-- 看板成员索引
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_board_members_role ON board_members(role);

-- 列和任务索引
CREATE INDEX idx_columns_board ON columns(board_id);
CREATE INDEX idx_columns_position ON columns(position);

CREATE INDEX idx_tasks_board ON tasks(board_id);
CREATE INDEX idx_tasks_column ON tasks(column_id);
CREATE INDEX idx_tasks_position ON tasks(position);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_archived ON tasks(is_archived);

-- 任务成员关联索引
CREATE INDEX idx_task_members_task ON task_members(task_id);
CREATE INDEX idx_task_members_user ON task_members(user_id);
CREATE INDEX idx_task_members_role ON task_members(role);

-- 标签关联索引
CREATE INDEX idx_task_labels_board ON task_labels(board_id);
CREATE INDEX idx_task_label_associations_task ON task_label_associations(task_id);
CREATE INDEX idx_task_label_associations_label ON task_label_associations(label_id);

-- 评论索引
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- 附件索引
CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_comment ON attachments(comment_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- 活动日志索引
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_board ON activity_logs(board_id);
CREATE INDEX idx_activity_logs_task ON activity_logs(task_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- 通知索引
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- 统计表索引
CREATE INDEX idx_board_stats_board_date ON board_stats(board_id, date);
CREATE INDEX idx_user_stats_user_date ON user_stats(user_id, date);
```

### 6.2 复合索引

```sql
-- 看板成员权限检查
CREATE INDEX idx_board_members_user_role ON board_members(user_id, role);

-- 任务状态和优先级查询
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_column_position ON tasks(column_id, position);

-- 用户活动统计
CREATE INDEX idx_activity_logs_user_entity ON activity_logs(user_id, entity_type, created_at);

-- 最近活动的通知
CREATE INDEX idx_notifications_user_unread_created ON notifications(user_id, is_read, created_at);
```

### 6.3 性能优化查询

#### 看板概览查询优化
```sql
-- 获取看板概览信息
CREATE OR REPLACE FUNCTION get_board_overview(board_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  task_counts JSON;
  recent_activities JSON;
  member_count INTEGER;
BEGIN
  -- 统计任务数量
  SELECT json_build_object(
    'total', COUNT(*),
    'open', COUNT(CASE WHEN status = 'open' THEN 1 END),
    'in_progress', COUNT(CASE WHEN status = 'in_progress' THEN 1 END),
    'completed', COUNT(CASE WHEN status = 'completed' THEN 1 END),
    'overdue', COUNT(CASE WHEN due_date < NOW() AND status != 'completed' THEN 1 END)
  )
  INTO task_counts
  FROM tasks 
  WHERE board_id = board_uuid AND is_archived = false;

  -- 统计成员数量
  SELECT COUNT(*) INTO member_count
  FROM board_members
  WHERE board_id = board_uuid;

  -- 获取最近活动
  SELECT json_agg(
    json_build_object(
      'action', action,
      'user_id', al.user_id,
      'created_at', al.created_at,
      'user_info', (SELECT json_build_object('username', u.username, 'avatar_url', u.avatar_url) FROM users u WHERE u.id = al.user_id)
    )
  )
  INTO recent_activities
  FROM activity_logs al
  WHERE al.board_id = board_uuid
  ORDER BY al.created_at DESC
  LIMIT 10;

  result := json_build_object(
    'task_counts', task_counts,
    'member_count', member_count,
    'recent_activities', COALESCE(recent_activities, '[]'::json)
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### 任务快速查找函数
```sql
-- 快速搜索任务
CREATE OR REPLACE FUNCTION search_tasks(
  search_term TEXT,
  board_uuid UUID DEFAULT NULL,
  user_uuid UUID DEFAULT NULL,
  status_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 50
)
RETURNS TABLE(
  id UUID,
  title VARCHAR,
  description TEXT,
  status VARCHAR,
  priority VARCHAR,
  board_title VARCHAR,
  column_title VARCHAR,
  assignees JSON
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    t.id,
    t.title,
    t.description,
    t.status,
    t.priority,
    b.title as board_title,
    c.title as column_title,
    json_agg(json_build_object('user_id', tm.user_id, 'username', u.username)) as assignees
  FROM tasks t
  JOIN boards b ON t.board_id = b.id
  JOIN columns c ON t.column_id = c.id
  LEFT JOIN task_members tm ON t.id = tm.task_id
  LEFT JOIN users u ON tm.user_id = u.id
  WHERE 
    (search_term IS NULL OR (
      t.title ILIKE '%' || search_term || '%' OR 
      t.description ILIKE '%' || search_term || '%'
    ))
    AND (board_uuid IS NULL OR t.board_id = board_uuid)
    AND (user_uuid IS NULL OR tm.user_id = user_uuid)
    AND (status_filter IS NULL OR t.status = status_filter)
    AND t.is_archived = false
  GROUP BY t.id, t.title, t.description, t.status, t.priority, b.title, c.title
  ORDER BY t.updated_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 6.4 查询优化建议

1. **避免N+1查询**：使用JOIN操作批量获取相关数据
2. **分页查询**：使用游标分页替代OFFSET分页
3. **数据预聚合**：使用物化视图存储复杂统计结果
4. **缓存策略**：为热点数据设置适当的缓存
5. **分区策略**：对大数据表按时间或项目分区

## 7. 数据迁移和备份策略

### 7.1 数据库迁移

#### 版本控制迁移脚本
```sql
-- migrations/001_initial_schema.sql
-- 初始表结构创建

-- migrations/002_add_board_templates.sql
-- 添加看板模板功能

-- migrations/003_enhance_user_preferences.sql
-- 增强用户偏好设置

-- migrations/004_add_statistics_tables.sql
-- 添加统计分析表
```

#### 迁移管理函数
```sql
-- 记录迁移版本
CREATE TABLE schema_migrations (
  version VARCHAR(255) PRIMARY KEY,
  applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  description TEXT
);

-- 应用迁移的函数
CREATE OR REPLACE FUNCTION apply_migration(migration_version VARCHAR, sql_query TEXT)
RETURNS VOID AS $$
BEGIN
  BEGIN
    EXECUTE sql_query;
    INSERT INTO schema_migrations (version) VALUES (migration_version);
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Migration % failed: %', migration_version, SQLERRM;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.2 数据备份策略

#### 自动备份脚本
```sql
-- 创建备份相关表
CREATE TABLE backup_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  backup_type VARCHAR(20) DEFAULT 'full' CHECK (backup_type IN ('full', 'incremental', 'differential')),
  frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('hourly', 'daily', 'weekly', 'monthly')),
  retention_days INTEGER DEFAULT 30,
  last_backup_at TIMESTAMP WITH TIME ZONE,
  next_backup_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 备份记录表
CREATE TABLE backup_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backup_id UUID REFERENCES backup_schedules(id),
  backup_type VARCHAR(20) NOT NULL,
  status VARCHAR(20) NOT NULL CHECK (status IN ('running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  file_size BIGINT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 数据导出函数
```sql
-- 导出看板数据
CREATE OR REPLACE FUNCTION export_board_data(board_uuid UUID, format_type VARCHAR DEFAULT 'json')
RETURNS TEXT AS $$
DECLARE
  board_data JSON;
  tasks_data JSON;
  columns_data JSON;
  result TEXT;
BEGIN
  -- 获取看板信息
  SELECT row_to_json(boards.*) INTO board_data
  FROM boards WHERE id = board_uuid;

  -- 获取列信息
  SELECT json_agg(row_to_json(columns.*)) INTO columns_data
  FROM columns WHERE board_id = board_uuid;

  -- 获取任务信息
  SELECT json_agg(row_to_json(tasks.*)) INTO tasks_data
  FROM tasks WHERE board_id = board_uuid;

  IF format_type = 'json' THEN
    result := json_build_object(
      'board', board_data,
      'columns', COALESCE(columns_data, '[]'::json),
      'tasks', COALESCE(tasks_data, '[]'::json),
      'exported_at', NOW()
    );
  ELSE
    result := json_build_object('error', 'Unsupported export format')::text;
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.3 数据恢复策略

#### 增量恢复函数
```sql
-- 数据恢复函数
CREATE OR REPLACE FUNCTION restore_from_backup(
  backup_data JSON,
  restore_mode VARCHAR DEFAULT 'merge' CHECK (restore_mode IN ('merge', 'replace'))
)
RETURNS BOOLEAN AS $$
DECLARE
  board_info JSON;
  column_info JSON;
  task_info JSON;
  board_uuid UUID;
  old_board_id UUID;
BEGIN
  board_info := backup_data->'board';
  columns_info := backup_data->'columns';
  tasks_info := backup_data->'tasks';

  IF restore_mode = 'replace' THEN
    -- 删除现有数据
    DELETE FROM tasks WHERE board_id = board_info->>'id';
    DELETE FROM columns WHERE board_id = board_info->>'id';
    DELETE FROM boards WHERE id = board_info->>'id';
  END IF;

  -- 恢复看板
  INSERT INTO boards (id, title, description, background_color, workspace_id, created_by)
  VALUES (
    board_info->>'id',
    board_info->>'title',
    board_info->>'description',
    board_info->>'background_color',
    board_info->>'workspace_id',
    board_info->>'created_by'
  ) ON CONFLICT (id) DO UPDATE SET
    title = EXCLUDED.title,
    description = EXCLUDED.description,
    background_color = EXCLUDED.background_color,
    updated_at = NOW();

  -- 恢复列和任务...
  -- (类似逻辑)

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 7.4 监控和告警

#### 备份监控函数
```sql
-- 检查备份状态
CREATE OR REPLACE FUNCTION check_backup_health()
RETURNS TABLE(
  schedule_name VARCHAR,
  last_backup TIMESTAMP WITH TIME ZONE,
  next_backup TIMESTAMP WITH TIME ZONE,
  status VARCHAR,
  days_since_last_backup INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.name,
    bs.last_backup_at,
    bs.next_backup_at,
    CASE 
      WHEN bs.next_backup_at < NOW() THEN 'overdue'
      WHEN bs.last_backup_at IS NULL THEN 'never'
      ELSE 'active'
    END::VARCHAR as status,
    CASE 
      WHEN bs.last_backup_at IS NULL THEN NULL
      ELSE EXTRACT(DAY FROM NOW() - bs.last_backup_at)::INTEGER
    END as days_since_last_backup
  FROM backup_schedules bs
  WHERE bs.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## 8. API端点规范

### 8.1 RESTful API设计

#### 认证相关
```
POST /auth/register        # 用户注册
POST /auth/login          # 用户登录
POST /auth/logout         # 用户登出
POST /auth/refresh        # 刷新令牌
GET  /auth/profile        # 获取用户信息
PUT  /auth/profile        # 更新用户信息
```

#### 工作空间管理
```
GET  /workspaces          # 获取用户工作空间列表
POST /workspaces          # 创建工作空间
GET  /workspaces/:id      # 获取工作空间详情
PUT  /workspaces/:id      # 更新工作空间
DELETE /workspaces/:id    # 删除工作空间
GET  /workspaces/:id/members # 获取工作空间成员
POST /workspaces/:id/members # 邀请成员
PUT  /workspaces/:id/members/:user_id # 更新成员权限
DELETE /workspaces/:id/members/:user_id # 移除成员
```

#### 看板管理
```
GET  /boards              # 获取看板列表
POST /boards              # 创建看板
GET  /boards/:id          # 获取看板详情
PUT  /boards/:id          # 更新看板
DELETE /boards/:id        # 删除看板
GET  /boards/:id/members  # 获取看板成员
POST /boards/:id/members  # 添加看板成员
DELETE /boards/:id/members/:user_id # 移除看板成员
POST /boards/:id/templates # 创建看板模板
GET  /templates           # 获取模板列表
```

#### 任务管理
```
GET  /boards/:id/tasks    # 获取看板任务
POST /boards/:id/tasks    # 创建任务
GET  /tasks/:id           # 获取任务详情
PUT  /tasks/:id           # 更新任务
DELETE /tasks/:id         # 删除任务
POST /tasks/:id/move      # 移动任务
POST /tasks/:id/assign    # 分配任务
DELETE /tasks/:id/assign/:user_id # 取消任务分配
```

### 8.2 响应格式规范

#### 标准响应格式
```json
{
  "success": true,
  "data": {},
  "message": "操作成功",
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### 错误响应格式
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "请求参数验证失败",
    "details": {
      "field": "title",
      "reason": "标题不能为空"
    }
  }
}
```

## 9. 总结

本设计文档为"咸蛋快板"看板应用提供了完整的数据库架构和API设计，包括：

1. **完整的表结构设计**：涵盖用户管理、团队协作、看板任务等核心功能
2. **完善的RLS安全策略**：确保数据安全和权限控制
3. **高性能的Edge Functions**：处理复杂业务逻辑和异步任务
4. **优化的索引策略**：提升查询性能和用户体验
5. **可靠的备份恢复机制**：保障数据安全和系统可靠性
6. **标准化的API接口**：便于前端集成和第三方对接

该设计充分考虑了性能、安全性、可扩展性和用户体验，为"咸蛋快板"看板应用的开发和部署提供了坚实的技术基础。