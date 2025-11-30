# Xiandan Kanban Board Application - Database and API Design Document

## 1. Project Overview

Xiandan Kanban is a modern kanban task management application, similar to a combination of Trello and Notion. This document describes the complete database architecture, API design, and security strategy in detail.

## 2. Database Table Structure Design

### 2.1 User Management Tables

#### users table
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

#### user_profiles table
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

### 2.2 Team and Workspace Tables

#### workspaces table
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

#### workspace_members table
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

### 2.3 Board-related Tables

#### boards table
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

#### board_members table
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

#### board_templates table
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

### 2.4 Column and Task Tables

#### columns table
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

#### tasks table
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

#### task_labels table
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

#### task_label_associations table
```sql
CREATE TABLE task_label_associations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES task_labels(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(task_id, label_id)
);
```

#### task_members table
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

### 2.5 Comments and Attachments Tables

#### comments table
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

#### attachments table
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

### 2.6 Activity and Notification Tables

#### activity_logs table
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

#### notifications table
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

### 2.7 Statistics and Analysis Tables

#### board_stats table
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

#### user_stats table
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

## 3. Table Relationships and Foreign Key Constraints

### 3.1 Relationship Diagram
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

### 3.2 Key Constraints

1. **User Permission Constraints**: Use RLS policies to ensure users can only access resources they have permissions for
2. **Data Consistency**: Use foreign key constraints to ensure data integrity
3. **Uniqueness Constraints**: Prevent duplicate data (e.g., usernames, emails)
4. **Check Constraints**: Limit the validity of enum values
5. **Cascade Deletion**: Set reasonable cascade deletion rules to avoid data islands

## 4. RLS (Row Level Security) Security Policies

### 4.1 User Table Policies

```sql
-- Users can view and edit their own profile
CREATE POLICY "Users can view own profile" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON users
  FOR UPDATE USING (auth.uid() = id);

-- Public information is viewable (username, avatar, etc.)
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

### 4.2 Workspace Policies

```sql
-- Only workspace members can view workspace
CREATE POLICY "Workspace members can view workspace" ON workspaces
  FOR SELECT USING (
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Only workspace creator and admins can modify
CREATE POLICY "Admins can modify workspace" ON workspaces
  FOR UPDATE USING (
    owner_id = auth.uid() OR 
    id IN (
      SELECT workspace_id FROM workspace_members 
      WHERE user_id = auth.uid() AND role IN ('admin', 'owner')
    )
  );
```

### 4.3 Board Policies

```sql
-- Board members can view board
CREATE POLICY "Board members can view board" ON boards
  FOR SELECT USING (
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    ) OR
    visibility = 'public'
  );

-- Board creator and admins can modify
CREATE POLICY "Board admins can modify board" ON boards
  FOR UPDATE USING (
    created_by = auth.uid() OR 
    id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
    )
  );
```

### 4.4 Task Policies

```sql
-- Task access permissions depend on permissions of the board they belong to
CREATE POLICY "Tasks visible to board members" ON tasks
  FOR SELECT USING (
    board_id IN (
      SELECT board_id FROM board_members 
      WHERE user_id = auth.uid()
    )
  );

-- Only task assignee, creator, and board admins can modify
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

### 4.5 Universal Policy Functions

```sql
-- Check if user is workspace member
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

-- Check if user is board member
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

## 5. Edge Functions Interface Design

### 5.1 Email Notification Service

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
    
    // Get user email and notification preferences
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

    // Create in-app notification
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

    // Send email notification
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

### 5.2 Task Statistics Service

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

    // Calculate board statistics
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

    // Calculate member activity
    for (const task of statsQuery.data) {
      const userId = task.task_members[0]?.user_id
      if (userId) {
        stats.member_activity[userId] = (stats.member_activity[userId] || 0) + 1
      }
    }

    // Calculate average completion time
    const completedTasks = statsQuery.data.filter(t => t.status === 'completed' && t.completed_at)
    if (completedTasks.length > 0) {
      const totalTime = completedTasks.reduce((sum, task) => {
        const completionTime = new Date(task.completed_at).getTime() - new Date(task.created_at).getTime()
        return sum + completionTime
      }, 0)
      stats.avg_completion_time = totalTime / completedTasks.length / (1000 * 60 * 60) // hours
    }

    // Save statistics
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

### 5.3 Batch Operation Service

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
          // Batch move tasks
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
          // Batch update task attributes
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
          // Batch archive tasks
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
          // Batch delete tasks (soft delete)
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

### 5.4 Report Generation Service

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
    
    // Get board basic information
    const boardQuery = await supabase
      .from('boards')
      .select('title, description, created_at')
      .eq('id', board_id)
      .single()

    if (!boardQuery.data) {
      throw new Error('Board not found')
    }

    // Calculate time range
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

    // Get statistics data
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

    // Generate summary
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

      // Generate insights
      if (report.summary.completion_rate > 80) {
        report.insights.push('Board completion rate is excellent')
      } else if (report.summary.completion_rate < 50) {
        report.insights.push('Recommend optimizing task workflow to improve completion rate')
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

## 6. Database Indexing and Performance Optimization

### 6.1 Index Strategy

```sql
-- User-related indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

-- Workspace member indexes
CREATE INDEX idx_workspace_members_workspace ON workspace_members(workspace_id);
CREATE INDEX idx_workspace_members_user ON workspace_members(user_id);
CREATE INDEX idx_workspace_members_status ON workspace_members(status);

-- Board-related indexes
CREATE INDEX idx_boards_workspace ON boards(workspace_id);
CREATE INDEX idx_boards_created_by ON boards(created_by);
CREATE INDEX idx_boards_archived ON boards(is_archived);

-- Board member indexes
CREATE INDEX idx_board_members_board ON board_members(board_id);
CREATE INDEX idx_board_members_user ON board_members(user_id);
CREATE INDEX idx_board_members_role ON board_members(role);

-- Column and task indexes
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

-- Task member association indexes
CREATE INDEX idx_task_members_task ON task_members(task_id);
CREATE INDEX idx_task_members_user ON task_members(user_id);
CREATE INDEX idx_task_members_role ON task_members(role);

-- Label association indexes
CREATE INDEX idx_task_labels_board ON task_labels(board_id);
CREATE INDEX idx_task_label_associations_task ON task_label_associations(task_id);
CREATE INDEX idx_task_label_associations_label ON task_label_associations(label_id);

-- Comment indexes
CREATE INDEX idx_comments_task ON comments(task_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created_at ON comments(created_at);

-- Attachment indexes
CREATE INDEX idx_attachments_task ON attachments(task_id);
CREATE INDEX idx_attachments_comment ON attachments(comment_id);
CREATE INDEX idx_attachments_uploaded_by ON attachments(uploaded_by);

-- Activity log indexes
CREATE INDEX idx_activity_logs_user ON activity_logs(user_id);
CREATE INDEX idx_activity_logs_board ON activity_logs(board_id);
CREATE INDEX idx_activity_logs_task ON activity_logs(task_id);
CREATE INDEX idx_activity_logs_created_at ON activity_logs(created_at);

-- Notification indexes
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at);

-- Statistics table indexes
CREATE INDEX idx_board_stats_board_date ON board_stats(board_id, date);
CREATE INDEX idx_user_stats_user_date ON user_stats(user_id, date);
```

### 6.2 Composite Indexes

```sql
-- Board member permission checks
CREATE INDEX idx_board_members_user_role ON board_members(user_id, role);

-- Task status and priority queries
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_column_position ON tasks(column_id, position);

-- User activity statistics
CREATE INDEX idx_activity_logs_user_entity ON activity_logs(user_id, entity_type, created_at);

-- Recent activity notifications
CREATE INDEX idx_notifications_user_unread_created ON notifications(user_id, is_read, created_at);
```

### 6.3 Performance Optimization Queries

#### Board Overview Query Optimization
```sql
-- Get board overview information
CREATE OR REPLACE FUNCTION get_board_overview(board_uuid UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  task_counts JSON;
  recent_activities JSON;
  member_count INTEGER;
BEGIN
  -- Count task statistics
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

  -- Count member statistics
  SELECT COUNT(*) INTO member_count
  FROM board_members
  WHERE board_id = board_uuid;

  -- Get recent activities
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
$$ LANGUAGE plpgsql;
```

---

**Document Version**: v1.0  
**Creation Date**: 2025-11-29  
**Last Updated**: 2025-11-29  
**Author**: Database Design Team