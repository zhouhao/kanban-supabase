# 咸蛋快板看板应用 - 邮件提醒和统计系统设计

## 1. 系统概述

咸蛋快板看板应用的邮件提醒和统计系统旨在通过自动化邮件通知和数据分析，提升团队协作效率和项目管理质量。系统将基于Supabase平台构建，结合Cron Jobs定时任务、邮件服务集成和数据可视化组件。

### 1.1 核心功能
- 自动化邮件提醒（任务到期、状态变更、优先级提醒）
- 定期统计报告生成
- 实时数据看板展示
- 团队绩效分析
- 系统健康监控

### 1.2 技术架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端应用       │    │   Supabase      │    │   外部服务       │
│   (React)       │◄──►│   数据库         │◄──►│   (邮件服务)     │
│                 │    │                 │    │                 │
│ - 统计看板      │    │ - PostgreSQL    │    │ - 邮件API       │
│ - 图表展示      │    │ - Cron Jobs     │    │ - 通知服务      │
│ - 配置管理      │    │ - Edge Functions│    │ - 监控服务      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 2. 定时任务实现方案（Supabase Cron Jobs）

### 2.1 定时任务策略

#### 2.1.1 任务提醒定时器
```sql
-- 每日任务到期提醒（工作日上午9:00）
0 9 * * 1-5

-- 每周团队回顾报告（每周五下午17:00）
0 17 * * 5

-- 每月项目总结报告（每月最后一天23:00）
0 23 L * *
```

#### 2.1.2 数据统计定时器
```sql
-- 实时统计更新（每小时）
0 * * * *

-- 每日数据分析（深夜2:00）
0 2 * * *

-- 每周深度分析（周日晚上22:00）
0 22 * * 0
```

### 2.2 Cron Jobs配置实现

#### 2.2.1 创建定时任务Edge Function
```typescript
// supabase/functions/scheduled-tasks/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { task_type } = await req.json()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    switch (task_type) {
      case 'daily_reminder':
        await sendDailyReminders(supabase)
        break
      case 'weekly_report':
        await generateWeeklyReport(supabase)
        break
      case 'monthly_summary':
        await generateMonthlySummary(supabase)
        break
      case 'hourly_stats':
        await updateHourlyStats(supabase)
        break
      default:
        throw new Error(`Unknown task type: ${task_type}`)
    }

    return new Response(
      JSON.stringify({ success: true, task_type }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function sendDailyReminders(supabase: any) {
  // 获取今日到期任务
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id, title, description, due_date, status, priority,
      user:profiles!tasks_assignee_id_fkey(name, email),
      project:projects(name)
    `)
    .eq('due_date', new Date().toISOString().split('T')[0])
    .neq('status', 'completed')

  // 发送提醒邮件
  for (const task of tasks) {
    await sendTaskReminderEmail(task)
  }
}
```

#### 2.2.2 注册Cron Jobs
```sql
-- 每日任务提醒
SELECT cron.schedule(
  'daily-task-reminders',
  '0 9 * * 1-5',
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/scheduled-tasks'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb,
    body := ''{"task_type": "daily_reminder"}''::jsonb
  );'
);

-- 每周报告
SELECT cron.schedule(
  'weekly-reports',
  '0 17 * * 5',
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/scheduled-tasks'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb,
    body := ''{"task_type": "weekly_report"}''::jsonb
  );'
);

-- 每月总结
SELECT cron.schedule(
  'monthly-summaries',
  '0 23 L * *',
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/scheduled-tasks'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb,
    body := ''{"task_type": "monthly_summary"}''::jsonb
  );'
);

-- 每小时统计
SELECT cron.schedule(
  'hourly-stats',
  '0 * * * *',
  'SELECT net.http_post(
    url := ''https://your-project.supabase.co/functions/v1/scheduled-tasks'',
    headers := ''{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}''::jsonb,
    body := ''{"task_type": "hourly_stats"}''::jsonb
  );'
);
```

## 3. 邮件发送流程和模板设计

### 3.1 邮件服务集成

#### 3.1.1 配置邮件服务
```typescript
// 邮件服务配置
interface EmailConfig {
  provider: 'resend' | 'sendgrid' | 'mailgun'
  apiKey: string
  fromEmail: string
  fromName: string
}

// 邮件模板接口
interface EmailTemplate {
  subject: string
  htmlContent: string
  textContent?: string
  variables: Record<string, any>
}
```

#### 3.1.2 邮件发送服务
```typescript
// supabase/functions/send-email/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { to, template, data } = await req.json()
    
    const emailService = new EmailService()
    const result = await emailService.sendEmail({
      to,
      subject: template.subject,
      html: renderTemplate(template.htmlContent, data),
      text: template.textContent ? renderTemplate(template.textContent, data) : undefined
    })

    return new Response(
      JSON.stringify({ success: true, messageId: result.messageId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

class EmailService {
  private apiKey = Deno.env.get('RESEND_API_KEY')!
  
  async sendEmail(params: {
    to: string
    subject: string
    html: string
    text?: string
  }) {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: '咸蛋快板 <noreply@xiankuaiban.com>',
        to: [params.to],
        subject: params.subject,
        html: params.html,
        text: params.text,
      }),
    })

    if (!response.ok) {
      throw new Error(`邮件发送失败: ${response.statusText}`)
    }

    return await response.json()
  }
}
```

### 3.2 邮件模板设计

#### 3.2.1 任务提醒模板
```html
<!-- 模板：task-reminder.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>任务提醒</title>
    <style>
        .email-container { max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9f9f9; }
        .task-card { background: white; border-radius: 8px; padding: 20px; margin: 10px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .priority-high { border-left: 4px solid #e53e3e; }
        .priority-medium { border-left: 4px solid #ed8936; }
        .priority-low { border-left: 4px solid #38a169; }
        .button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 15px; }
        .footer { text-align: center; padding: 20px; color: #666; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📋 任务提醒</h1>
            <p>您有任务需要关注</p>
        </div>
        
        <div class="content">
            <div class="task-card priority-{{task.priority}}">
                <h2>{{task.title}}</h2>
                <p><strong>项目：</strong>{{project.name}}</p>
                <p><strong>截止时间：</strong>{{task.due_date}}</p>
                <p><strong>优先级：</strong>
                    <span class="priority-badge priority-{{task.priority}}">
                        {{#if task.priority === 'high'}}🔴 高{{/if}}
                        {{#if task.priority === 'medium'}}🟡 中{{/if}}
                        {{#if task.priority === 'low'}}🟢 低{{/if}}
                    </span>
                </p>
                {{#if task.description}}
                <p><strong>描述：</strong>{{task.description}}</p>
                {{/if}}
                <a href="{{appUrl}}/tasks/{{task.id}}" class="button">查看详情</a>
            </div>
            
            <p>如有任何问题，请随时联系您的团队负责人。</p>
        </div>
        
        <div class="footer">
            <p>咸蛋快板 - 让项目管理更简单</p>
            <p>此邮件由系统自动发送，请勿回复</p>
        </div>
    </div>
</body>
</html>
```

#### 3.2.2 周报告模板
```html
<!-- 模板：weekly-report.html -->
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>周工作报告</title>
    <style>
        .email-container { max-width: 800px; margin: 0 auto; font-family: Arial, sans-serif; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; padding: 20px; }
        .stat-card { background: white; border-radius: 12px; padding: 20px; text-align: center; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .stat-number { font-size: 2.5em; font-weight: bold; color: #667eea; }
        .chart-container { background: white; margin: 20px; padding: 20px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <h1>📊 周工作报告</h1>
            <p>{{week.start}} - {{week.end}}</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">{{stats.totalTasks}}</div>
                <p>总任务数</p>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{stats.completedTasks}}</div>
                <p>已完成</p>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{stats.completionRate}}%</div>
                <p>完成率</p>
            </div>
            <div class="stat-card">
                <div class="stat-number">{{stats.teamMembers}}</div>
                <p>团队成员</p>
            </div>
        </div>
        
        <div class="chart-container">
            <h3>任务状态分布</h3>
            <div style="height: 300px; display: flex; align-items: end; gap: 20px;">
                {{#each statusData}}
                <div style="flex: 1; text-align: center;">
                    <div style="height: {{percentage}}%; background: {{color}}; border-radius: 8px 8px 0 0;"></div>
                    <p>{{label}}: {{count}}</p>
                </div>
                {{/each}}
            </div>
        </div>
        
        <div class="chart-container">
            <h3>团队成员绩效</h3>
            {{#each memberPerformance}}
            <div style="margin: 15px 0; padding: 10px; border-left: 4px solid #667eea; background: #f8f9fa;">
                <strong>{{name}}</strong>
                <div style="margin-top: 5px;">
                    完成率: {{completionRate}}% | 平均处理时间: {{avgTime}}小时
                </div>
            </div>
            {{/each}}
        </div>
        
        <div class="chart-container">
            <h3>下周重点关注</h3>
            {{#each upcomingPriorities}}
            <div style="margin: 10px 0; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px;">
                <strong>{{title}}</strong>
                <p>{{description}}</p>
            </div>
            {{/each}}
        </div>
    </div>
</body>
</html>
```

#### 3.2.3 模板渲染函数
```typescript
function renderTemplate(template: string, data: Record<string, any>): string {
  let rendered = template
  
  // 简单模板替换
  for (const [key, value] of Object.entries(data)) {
    const placeholder = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(placeholder, String(value))
  }
  
  // Handlebars风格的模板支持
  rendered = rendered.replace(/{{#if\s+([^}]+)}}([\s\S]*?){{\/if}}/g, (match, condition, content) => {
    // 简单的条件判断逻辑
    if (evaluateCondition(condition, data)) {
      return renderTemplate(content, data)
    }
    return ''
  })
  
  return rendered
}

function evaluateCondition(condition: string, data: Record<string, any>): boolean {
  // 简化的条件评估逻辑
  if (condition.includes('===')) {
    const [left, right] = condition.split('===').map(s => s.trim())
    return String(getNestedValue(left, data)) === String(getNestedValue(right, data))
  }
  return Boolean(getNestedValue(condition, data))
}

function getNestedValue(path: string, data: Record<string, any>): any {
  return path.split('.').reduce((obj, key) => obj?.[key], data)
}
```

## 4. 统计指标计算逻辑

### 4.1 核心统计指标

#### 4.1.1 任务统计指标
```sql
-- 任务总数统计
CREATE OR REPLACE FUNCTION get_task_statistics(
  p_project_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_tasks', COUNT(*),
    'completed_tasks', COUNT(*) FILTER (WHERE status = 'completed'),
    'in_progress_tasks', COUNT(*) FILTER (WHERE status = 'in_progress'),
    'pending_tasks', COUNT(*) FILTER (WHERE status = 'pending'),
    'overdue_tasks', COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed'),
    'completion_rate', ROUND(
      COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 2
    ),
    'average_completion_time', ROUND(
      AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600)::numeric, 2
    ),
    'priority_distribution', json_build_object(
      'high', COUNT(*) FILTER (WHERE priority = 'high'),
      'medium', COUNT(*) FILTER (WHERE priority = 'medium'),
      'low', COUNT(*) FILTER (WHERE priority = 'low')
    ),
    'status_distribution', json_build_object(
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'in_progress', COUNT(*) FILTER (WHERE status = 'in_progress'),
      'completed', COUNT(*) FILTER (WHERE status = 'completed'),
      'cancelled', COUNT(*) FILTER (WHERE status = 'cancelled')
    )
  ) INTO v_result
  FROM tasks
  WHERE (p_project_id IS NULL OR project_id = p_project_id)
    AND created_at >= p_start_date
    AND created_at <= p_end_date;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

#### 4.1.2 团队绩效统计
```sql
-- 团队成员绩效分析
CREATE OR REPLACE FUNCTION get_team_performance(
  p_project_id UUID DEFAULT NULL,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  WITH member_stats AS (
    SELECT 
      p.id,
      p.name,
      p.email,
      COUNT(t.id) as total_tasks,
      COUNT(t.id) FILTER (WHERE t.status = 'completed') as completed_tasks,
      COUNT(t.id) FILTER (WHERE t.due_date < CURRENT_DATE AND t.status != 'completed') as overdue_tasks,
      ROUND(
        COUNT(t.id) FILTER (WHERE t.status = 'completed') * 100.0 / 
        NULLIF(COUNT(t.id), 0), 2
      ) as completion_rate,
      AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600) as avg_completion_hours,
      COUNT(t.id) FILTER (WHERE t.priority = 'high') as high_priority_tasks
    FROM profiles p
    LEFT JOIN tasks t ON t.assignee_id = p.id
      AND (p_project_id IS NULL OR t.project_id = p_project_id)
      AND t.created_at >= p_start_date
      AND t.created_at <= p_end_date
    WHERE p.team_member = true
    GROUP BY p.id, p.name, p.email
  )
  SELECT json_agg(
    json_build_object(
      'member_id', id,
      'name', name,
      'email', email,
      'total_tasks', COALESCE(total_tasks, 0),
      'completed_tasks', COALESCE(completed_tasks, 0),
      'overdue_tasks', COALESCE(overdue_tasks, 0),
      'completion_rate', COALESCE(completion_rate, 0),
      'avg_completion_hours', ROUND(COALESCE(avg_completion_hours, 0), 2),
      'high_priority_tasks', COALESCE(high_priority_tasks, 0)
    )
  ) INTO v_result
  FROM member_stats;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

#### 4.1.3 项目健康度分析
```sql
-- 项目健康度评分
CREATE OR REPLACE FUNCTION calculate_project_health_score(
  p_project_id UUID,
  p_period_days INTEGER DEFAULT 30
) RETURNS JSON AS $$
DECLARE
  v_total_tasks INTEGER;
  v_completed_tasks INTEGER;
  v_overdue_tasks INTEGER;
  v_completion_rate NUMERIC;
  v_health_score NUMERIC;
  v_result JSON;
BEGIN
  -- 获取基本统计
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed'),
    ROUND(COUNT(*) FILTER (WHERE status = 'completed') * 100.0 / NULLIF(COUNT(*), 0), 2)
  INTO v_total_tasks, v_completed_tasks, v_overdue_tasks, v_completion_rate
  FROM tasks
  WHERE project_id = p_project_id
    AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_period_days;
  
  -- 计算健康度评分
  v_health_score := 0;
  
  -- 完成率评分 (0-40分)
  IF v_completion_rate >= 90 THEN
    v_health_score := v_health_score + 40;
  ELSIF v_completion_rate >= 80 THEN
    v_health_score := v_health_score + 35;
  ELSIF v_completion_rate >= 70 THEN
    v_health_score := v_health_score + 30;
  ELSIF v_completion_rate >= 60 THEN
    v_health_score := v_health_score + 20;
  ELSE
    v_health_score := v_health_score + 10;
  END IF;
  
  -- 逾期率评分 (0-30分)
  IF v_total_tasks > 0 THEN
    DECLARE
      v_overdue_rate NUMERIC := (v_overdue_tasks * 100.0 / v_total_tasks);
    BEGIN
      IF v_overdue_rate <= 10 THEN
        v_health_score := v_health_score + 30;
      ELSIF v_overdue_rate <= 20 THEN
        v_health_score := v_health_score + 25;
      ELSIF v_overdue_rate <= 30 THEN
        v_health_score := v_health_score + 20;
      ELSIF v_overdue_rate <= 50 THEN
        v_health_score := v_health_score + 10;
      END IF;
    END;
  ELSE
    v_health_score := v_health_score + 30; -- 无任务时给满分
  END IF;
  
  -- 活跃度评分 (0-30分)
  DECLARE
    v_active_days INTEGER;
  BEGIN
    SELECT COUNT(DISTINCT DATE(created_at)) INTO v_active_days
    FROM tasks
    WHERE project_id = p_project_id
      AND created_at >= CURRENT_DATE - INTERVAL '1 day' * p_period_days;
    
    -- 根据活跃天数评分
    IF v_active_days >= p_period_days * 0.8 THEN
      v_health_score := v_health_score + 30;
    ELSIF v_active_days >= p_period_days * 0.6 THEN
      v_health_score := v_health_score + 25;
    ELSIF v_active_days >= p_period_days * 0.4 THEN
      v_health_score := v_health_score + 20;
    ELSIF v_active_days >= p_period_days * 0.2 THEN
      v_health_score := v_health_score + 10;
    END IF;
  END;
  
  SELECT json_build_object(
    'project_id', p_project_id,
    'total_tasks', COALESCE(v_total_tasks, 0),
    'completed_tasks', COALESCE(v_completed_tasks, 0),
    'overdue_tasks', COALESCE(v_overdue_tasks, 0),
    'completion_rate', COALESCE(v_completion_rate, 0),
    'health_score', ROUND(v_health_score, 1),
    'health_level', CASE 
      WHEN v_health_score >= 90 THEN '优秀'
      WHEN v_health_score >= 75 THEN '良好'
      WHEN v_health_score >= 60 THEN '一般'
      ELSE '需改善'
    END,
    'recommendations', build_recommendations(v_overdue_tasks, v_completion_rate)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

-- 生成改进建议
CREATE OR REPLACE FUNCTION build_recommendations(
  p_overdue_tasks INTEGER,
  p_completion_rate NUMERIC
) RETURNS JSON AS $$
DECLARE
  v_recommendations TEXT[] := '{}';
BEGIN
  -- 基于逾期任务数给出建议
  IF p_overdue_tasks > 5 THEN
    v_recommendations := array_append(v_recommendations, '建议优先处理逾期任务，调整任务分配策略');
  END IF;
  
  -- 基于完成率给出建议
  IF p_completion_rate < 70 THEN
    v_recommendations := array_append(v_recommendations, '完成率偏低，建议检查任务难度和团队工作量');
  ELSIF p_completion_rate < 85 THEN
    v_recommendations := array_append(v_recommendations, '完成率有提升空间，建议优化工作流程');
  END IF;
  
  -- 通用建议
  v_recommendations := array_append(v_recommendations, '建议定期进行团队回顾，持续改进');
  
  RETURN array_to_json(v_recommendations);
END;
$$ LANGUAGE plpgsql;
```

### 4.2 实时统计API

#### 4.2.1 统计API Edge Function
```typescript
// supabase/functions/stats-api/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const endpoint = url.pathname.split('/').pop()
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    let result: any

    switch (endpoint) {
      case 'dashboard':
        result = await getDashboardStats(supabase)
        break
      case 'tasks':
        result = await getTaskStatistics(supabase, url.searchParams)
        break
      case 'team':
        result = await getTeamPerformance(supabase, url.searchParams)
        break
      case 'projects':
        result = await getProjectHealth(supabase, url.searchParams)
        break
      case 'trends':
        result = await getTrendAnalysis(supabase, url.searchParams)
        break
      default:
        throw new Error('Unknown endpoint')
    }

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getDashboardStats(supabase: any) {
  const { data: projects } = await supabase
    .from('projects')
    .select('id, name')
  
  const dashboardData = {
    overview: {
      totalProjects: projects?.length || 0,
      activeProjects: 0,
      totalTasks: 0,
      completedToday: 0,
      overdueTasks: 0
    },
    projects: [],
    trends: {
      taskCompletion: [],
      projectHealth: [],
      teamProductivity: []
    }
  }

  if (projects) {
    for (const project of projects) {
      const { data: stats } = await supabase
        .rpc('get_task_statistics', {
          p_project_id: project.id,
          p_start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          p_end_date: new Date().toISOString().split('T')[0]
        })
      
      if (stats) {
        dashboardData.projects.push({
          id: project.id,
          name: project.name,
          ...stats
        })
      }
    }
  }

  // 计算总体统计
  dashboardData.overview.activeProjects = dashboardData.projects.length
  dashboardData.overview.totalTasks = dashboardData.projects.reduce((sum, p) => sum + (p.total_tasks || 0), 0)
  dashboardData.overview.completedToday = dashboardData.projects.reduce((sum, p) => sum + (p.completed_tasks || 0), 0)
  dashboardData.overview.overdueTasks = dashboardData.projects.reduce((sum, p) => sum + (p.overdue_tasks || 0), 0)

  return dashboardData
}
```

## 5. 数据可视化和图表展示

### 5.1 前端统计看板组件

#### 5.1.1 主仪表板组件
```typescript
// components/StatsDashboard.tsx
import React, { useState, useEffect } from 'react'
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'

interface DashboardData {
  overview: {
    totalProjects: number
    activeProjects: number
    totalTasks: number
    completedToday: number
    overdueTasks: number
  }
  projects: Array<{
    id: string
    name: string
    total_tasks: number
    completed_tasks: number
    completion_rate: number
    overdue_tasks: number
  }>
  trends: {
    taskCompletion: Array<{ date: string; completed: number; created: number }>
    projectHealth: Array<{ name: string; score: number }>
    teamProductivity: Array<{ name: string; tasks: number; efficiency: number }>
  }
}

const StatsDashboard: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/functions/v1/stats-api/dashboard')
      if (!response.ok) throw new Error('Failed to fetch dashboard data')
      
      const result = await response.json()
      setData(result.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">加载中...</div>
  }

  if (error) {
    return <div className="text-red-500">错误: {error}</div>
  }

  if (!data) return null

  const COLORS = ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', '#00f2fe']

  return (
    <div className="p-6 space-y-6">
      {/* 总览卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总项目数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.overview.totalProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">活跃项目</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{data.overview.activeProjects}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">总任务数</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{data.overview.totalTasks}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">今日完成</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.overview.completedToday}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">逾期任务</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{data.overview.overdueTasks}</div>
          </CardContent>
        </Card>
      </div>

      {/* 图表区域 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 任务完成趋势 */}
        <Card>
          <CardHeader>
            <CardTitle>任务完成趋势</CardTitle>
            <CardDescription>过去7天的任务创建和完成情况</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={data.trends.taskCompletion}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="created" stackId="1" stroke="#667eea" fill="#667eea" />
                <Area type="monotone" dataKey="completed" stackId="2" stroke="#10b981" fill="#10b981" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* 项目健康度 */}
        <Card>
          <CardHeader>
            <CardTitle>项目健康度</CardTitle>
            <CardDescription>各项目健康度评分</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.trends.projectHealth}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="score" fill="#667eea" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* 项目详情表格 */}
      <Card>
        <CardHeader>
          <CardTitle>项目详细统计</CardTitle>
          <CardDescription>各项目的详细数据统计</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">项目名称</th>
                  <th className="text-center p-2">总任务</th>
                  <th className="text-center p-2">已完成</th>
                  <th className="text-center p-2">完成率</th>
                  <th className="text-center p-2">逾期任务</th>
                  <th className="text-center p-2">健康度</th>
                </tr>
              </thead>
              <tbody>
                {data.projects.map((project) => (
                  <tr key={project.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 font-medium">{project.name}</td>
                    <td className="text-center p-2">{project.total_tasks}</td>
                    <td className="text-center p-2">{project.completed_tasks}</td>
                    <td className="text-center p-2">
                      <span className={`px-2 py-1 rounded text-sm ${
                        project.completion_rate >= 80 ? 'bg-green-100 text-green-800' :
                        project.completion_rate >= 60 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {project.completion_rate}%
                      </span>
                    </td>
                    <td className="text-center p-2">
                      {project.overdue_tasks > 0 && (
                        <span className="text-red-600 font-medium">{project.overdue_tasks}</span>
                      )}
                    </td>
                    <td className="text-center p-2">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            project.completion_rate >= 80 ? 'bg-green-500' :
                            project.completion_rate >= 60 ? 'bg-yellow-500' :
                            'bg-red-500'
                          }`}
                          style={{ width: `${project.completion_rate}%` }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default StatsDashboard
```

#### 5.1.2 团队绩效图表组件
```typescript
// components/TeamPerformanceChart.tsx
import React from 'react'
import { RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, ResponsiveContainer } from 'recharts'

interface TeamMember {
  name: string
  totalTasks: number
  completedTasks: number
  completionRate: number
  avgCompletionTime: number
  efficiency: number
}

interface TeamPerformanceProps {
  data: TeamMember[]
}

const TeamPerformanceChart: React.FC<TeamPerformanceProps> = ({ data }) => {
  const radarData = data.map(member => ({
    name: member.name,
    效率: member.efficiency,
    完成率: member.completionRate,
    工作量: (member.totalTasks / Math.max(...data.map(d => d.totalTasks))) * 100,
    速度: Math.max(100 - member.avgCompletionTime, 10) // 转换时间数据
  }))

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* 团队雷达图 */}
      <Card>
        <CardHeader>
          <CardTitle>团队能力雷达图</CardTitle>
          <CardDescription>团队成员各项能力对比</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="name" />
              <PolarRadiusAxis angle={90} domain={[0, 100]} />
              <Radar 
                name="效率" 
                dataKey="效率" 
                stroke="#667eea" 
                fill="#667eea" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="完成率" 
                dataKey="完成率" 
                stroke="#10b981" 
                fill="#10b981" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="工作量" 
                dataKey="工作量" 
                stroke="#f59e0b" 
                fill="#f59e0b" 
                fillOpacity={0.3} 
              />
              <Radar 
                name="速度" 
                dataKey="速度" 
                stroke="#ef4444" 
                fill="#ef4444" 
                fillOpacity={0.3} 
              />
              <Legend />
            </RadarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* 团队成员详细表格 */}
      <Card>
        <CardHeader>
          <CardTitle>团队成员详情</CardTitle>
          <CardDescription>各成员详细绩效数据</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {data.map((member, index) => (
              <div key={member.name} className="p-4 border rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">{member.name}</h4>
                  <span className={`px-2 py-1 rounded text-xs ${
                    member.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                    member.efficiency >= 60 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {member.efficiency}% 效率
                  </span>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">总任务:</span>
                    <span className="ml-1 font-medium">{member.totalTasks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">已完成:</span>
                    <span className="ml-1 font-medium text-green-600">{member.completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">完成率:</span>
                    <span className="ml-1 font-medium">{member.completionRate}%</span>
                  </div>
                  <div>
                    <span className="text-gray-500">平均耗时:</span>
                    <span className="ml-1 font-medium">{member.avgCompletionTime}小时</span>
                  </div>
                </div>
                
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>工作量分布</span>
                    <span>{member.totalTasks} / {Math.max(...data.map(d => d.totalTasks))}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full"
                      style={{ width: `${(member.totalTasks / Math.max(...data.map(d => d.totalTasks))) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default TeamPerformanceChart
```

### 5.2 实时数据更新

#### 5.2.1 WebSocket实时订阅
```typescript
// hooks/useRealtimeStats.ts
import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import type { RealtimeChannel } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export const useRealtimeStats = (projectId?: string) => {
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 获取初始数据
    fetchStats()

    // 设置实时订阅
    const channel: RealtimeChannel = supabase
      .channel('stats-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'tasks',
          filter: projectId ? `project_id=eq.${projectId}` : undefined,
        },
        (payload) => {
          console.log('任务变更:', payload)
          // 重新获取统计数据
          fetchStats()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [projectId])

  const fetchStats = async () => {
    try {
      const endpoint = projectId ? `/functions/v1/stats-api/tasks?project_id=${projectId}` : '/functions/v1/stats-api/dashboard'
      const response = await fetch(endpoint)
      const result = await response.json()
      setStats(result.data)
    } catch (error) {
      console.error('获取统计数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  return { stats, loading, refresh: fetchStats }
}
```

## 6. 系统监控和错误处理

### 6.1 监控指标

#### 6.1.1 业务指标监控
```sql
-- 创建监控视图
CREATE OR REPLACE VIEW system_metrics AS
SELECT 
  -- 邮件发送统计
  (SELECT COUNT(*) FROM email_logs WHERE created_at >= CURRENT_DATE) as emails_today,
  (SELECT COUNT(*) FROM email_logs WHERE status = 'failed' AND created_at >= CURRENT_DATE) as failed_emails_today,
  (SELECT AVG(EXTRACT(EPOCH FROM (sent_at - created_at))) FROM email_logs WHERE status = 'sent') as avg_email_delay,
  
  -- 定时任务执行统计
  (SELECT COUNT(*) FROM cron.job_run_details WHERE start_time >= CURRENT_DATE) as jobs_executed_today,
  (SELECT COUNT(*) FROM cron.job_run_details WHERE status = 'failed' AND start_time >= CURRENT_DATE) as failed_jobs_today,
  (SELECT AVG(EXTRACT(EPOCH FROM (end_time - start_time))) FROM cron.job_run_details WHERE status = 'success') as avg_job_duration,
  
  -- 数据库性能指标
  (SELECT COUNT(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
  (SELECT pg_database_size(current_database())) as db_size,
  
  -- 任务处理统计
  (SELECT COUNT(*) FROM tasks WHERE created_at >= CURRENT_DATE) as tasks_created_today,
  (SELECT COUNT(*) FROM tasks WHERE updated_at >= CURRENT_DATE) as tasks_updated_today,
  (SELECT COUNT(*) FROM tasks WHERE completed_at >= CURRENT_DATE) as tasks_completed_today;
```

#### 6.1.2 健康检查API
```typescript
// supabase/functions/health-check/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const healthData = await performHealthCheck(supabase)
    
    const statusCode = healthData.overall_status === 'healthy' ? 200 : 503

    return new Response(
      JSON.stringify(healthData),
      { 
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        overall_status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

async function performHealthCheck(supabase: any) {
  const checks = {
    database: await checkDatabase(supabase),
    email_service: await checkEmailService(),
    cron_jobs: await checkCronJobs(supabase),
    memory_usage: checkMemoryUsage(),
    disk_space: await checkDiskSpace()
  }

  const healthy_checks = Object.values(checks).filter(check => check.status === 'healthy').length
  const total_checks = Object.keys(checks).length
  const overall_status = healthy_checks === total_checks ? 'healthy' : 'degraded'

  return {
    overall_status,
    checks,
    summary: `${healthy_checks}/${total_checks} checks passed`,
    timestamp: new Date().toISOString()
  }
}

async function checkDatabase(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('system_metrics')
      .select('*')
      .single()
    
    if (error) throw error

    return {
      status: 'healthy',
      message: 'Database connection successful',
      data
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Database check failed: ${error.message}`
    }
  }
}

async function checkEmailService() {
  try {
    // 测试邮件API连接
    const testApiKey = Deno.env.get('RESEND_API_KEY')
    if (!testApiKey) {
      return {
        status: 'unhealthy',
        message: 'Email API key not configured'
      }
    }

    return {
      status: 'healthy',
      message: 'Email service configured'
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Email service check failed: ${error.message}`
    }
  }
}

async function checkCronJobs(supabase: any) {
  try {
    const { data, error } = await supabase
      .from('cron.job_run_details')
      .select('status, start_time')
      .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (error) throw error

    const failedJobs = data?.filter(job => job.status === 'failed') || []
    const totalJobs = data?.length || 0

    return {
      status: failedJobs.length > totalJobs * 0.1 ? 'degraded' : 'healthy',
      message: `${totalJobs} jobs executed in last 24h, ${failedJobs.length} failed`,
      data: {
        total_jobs: totalJobs,
        failed_jobs: failedJobs.length,
        failure_rate: totalJobs > 0 ? (failedJobs.length / totalJobs * 100).toFixed(2) + '%' : '0%'
      }
    }
  } catch (error) {
    return {
      status: 'unhealthy',
      message: `Cron jobs check failed: ${error.message}`
    }
  }
}

function checkMemoryUsage() {
  try {
    const used = (globalThis as any).performance?.memory?.usedJSHeapSize || 0
    const total = (globalThis as any).performance?.memory?.totalJSHeapSize || 0
    const usagePercent = total > 0 ? (used / total) * 100 : 0

    return {
      status: usagePercent > 90 ? 'unhealthy' : usagePercent > 75 ? 'degraded' : 'healthy',
      message: `Memory usage: ${usagePercent.toFixed(2)}%`,
      data: {
        used: Math.round(used / 1024 / 1024) + 'MB',
        total: Math.round(total / 1024 / 1024) + 'MB',
        percentage: usagePercent.toFixed(2) + '%'
      }
    }
  } catch {
    return {
      status: 'unknown',
      message: 'Memory information not available'
    }
  }
}

async function checkDiskSpace() {
  try {
    // 在Supabase环境中，通常不需要检查磁盘空间
    return {
      status: 'healthy',
      message: 'Disk space check not applicable in cloud environment'
    }
  } catch (error) {
    return {
      status: 'unknown',
      message: 'Disk space check not available'
    }
  }
}
```

### 6.2 错误处理和重试机制

#### 6.2.1 邮件发送错误处理
```typescript
// utils/emailRetryHandler.ts
interface EmailAttempt {
  email: string
  template: string
  data: any
  attemptCount: number
  lastError?: string
  nextRetryTime?: Date
}

class EmailRetryHandler {
  private attempts: Map<string, EmailAttempt> = new Map()
  private readonly maxAttempts = 3
  private readonly retryDelays = [1000, 5000, 15000] // 1秒, 5秒, 15秒

  async sendEmailWithRetry(params: {
    to: string
    subject: string
    html: string
    text?: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const emailKey = `${params.to}-${params.subject}`
    const attempt = this.attempts.get(emailKey) || {
      email: params.to,
      template: params.subject,
      data: params,
      attemptCount: 0
    }

    // 检查是否需要重试
    if (attempt.nextRetryTime && new Date() < attempt.nextRetryTime) {
      return { success: false, error: `等待重试时间: ${attempt.nextRetryTime.toISOString()}` }
    }

    if (attempt.attemptCount >= this.maxAttempts) {
      // 记录最终失败
      await this.logFailedEmail(attempt)
      this.attempts.delete(emailKey)
      return { success: false, error: '最大重试次数已用完' }
    }

    try {
      const result = await this.sendEmail(params)
      
      if (result.success) {
        this.attempts.delete(emailKey)
        await this.logSuccessfulEmail(attempt, result.messageId!)
        return result
      } else {
        throw new Error(result.error || '发送失败')
      }
    } catch (error) {
      attempt.attemptCount++
      attempt.lastError = error.message
      
      if (attempt.attemptCount < this.maxAttempts) {
        const delay = this.retryDelays[attempt.attemptCount - 1] || 15000
        attempt.nextRetryTime = new Date(Date.now() + delay)
        this.attempts.set(emailKey, attempt)
        
        // 记录重试
        await this.logRetry(attempt)
        
        return { success: false, error: `发送失败，将在 ${delay/1000} 秒后重试` }
      } else {
        this.attempts.delete(emailKey)
        await this.logFailedEmail(attempt)
        return { success: false, error: `发送失败: ${error.message}` }
      }
    }
  }

  private async sendEmail(params: any): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: '咸蛋快板 <noreply@xiankuaiban.com>',
          to: [params.to],
          subject: params.subject,
          html: params.html,
          text: params.text,
        }),
      })

      if (!response.ok) {
        throw new Error(`API错误: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      return { success: true, messageId: result.id }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  private async logSuccessfulEmail(attempt: EmailAttempt, messageId: string) {
    console.log(`邮件发送成功: ${attempt.email}, MessageID: ${messageId}`)
    // 记录到数据库
  }

  private async logFailedEmail(attempt: EmailAttempt) {
    console.error(`邮件发送最终失败: ${attempt.email}, 尝试次数: ${attempt.attemptCount}, 错误: ${attempt.lastError}`)
    // 记录到数据库，可能需要发送警报
  }

  private async logRetry(attempt: EmailAttempt) {
    console.log(`邮件发送重试: ${attempt.email}, 尝试次数: ${attempt.attemptCount}`)
    // 记录到数据库
  }

  // 获取需要重试的邮件列表
  getPendingRetries(): EmailAttempt[] {
    const now = new Date()
    return Array.from(this.attempts.values())
      .filter(attempt => attempt.nextRetryTime && now >= attempt.nextRetryTime)
  }

  // 处理待重试的邮件
  async processRetries(): Promise<void> {
    const pendingRetries = this.getPendingRetries()
    
    for (const attempt of pendingRetries) {
      await this.sendEmailWithRetry(attempt.data)
    }
  }
}
```

#### 6.2.2 定时任务错误恢复
```typescript
// supabase/functions/job-recovery/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 检查失败的定时任务
    const failedJobs = await getFailedJobs(supabase)
    const recoveryResults = []

    for (const job of failedJobs) {
      try {
        const result = await recoverJob(supabase, job)
        recoveryResults.push({
          jobId: job.jobname,
          status: 'recovered',
          result
        })
      } catch (error) {
        recoveryResults.push({
          jobId: job.jobname,
          status: 'failed',
          error: error.message
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        recovered: recoveryResults.filter(r => r.status === 'recovered').length,
        failed: recoveryResults.filter(r => r.status === 'failed').length,
        details: recoveryResults 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getFailedJobs(supabase: any) {
  const { data, error } = await supabase
    .from('cron.job_run_details')
    .select('jobname, run_id, job_pid, database, username, return_message')
    .eq('status', 'failed')
    .gte('start_time', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
    .order('start_time', { ascending: false })

  if (error) throw error
  return data || []
}

async function recoverJob(supabase: any, job: any) {
  // 根据不同的job类型执行不同的恢复逻辑
  switch (job.jobname) {
    case 'daily-task-reminders':
      return await runDailyReminders(supabase)
    case 'weekly-reports':
      return await runWeeklyReports(supabase)
    case 'monthly-summaries':
      return await runMonthlySummaries(supabase)
    case 'hourly-stats':
      return await runHourlyStats(supabase)
    default:
      // 重新触发job
      const { data, error } = await supabase.rpc('cron.schedule', {
        jobname: job.jobname,
        schedule: getJobSchedule(job.jobname),
        command: job.command
      })
      
      if (error) throw error
      return data
  }
}

async function runDailyReminders(supabase: any) {
  // 重新执行每日提醒逻辑
  const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/scheduled-tasks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ task_type: 'daily_reminder' }),
  })

  if (!response.ok) {
    throw new Error(`Daily reminders failed: ${response.statusText}`)
  }

  return await response.json()
}

function getJobSchedule(jobName: string): string {
  const schedules = {
    'daily-task-reminders': '0 9 * * 1-5',
    'weekly-reports': '0 17 * * 5',
    'monthly-summaries': '0 23 L * *',
    'hourly-stats': '0 * * * *'
  }
  return schedules[jobName] || '0 * * * *'
}
```

### 6.3 警报系统

#### 6.3.1 警报规则配置
```typescript
// types/alertRules.ts
interface AlertRule {
  id: string
  name: string
  description: string
  condition: {
    metric: string
    operator: '>' | '<' | '>=' | '<=' | '='
    threshold: number
    timeWindow: number // 分钟
  }
  actions: Array<{
    type: 'email' | 'slack' | 'webhook'
    target: string
    template: string
  }>
  enabled: boolean
  createdAt: Date
}

const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'email_failure_rate',
    name: '邮件发送失败率过高',
    description: '邮件发送失败率超过10%',
    condition: {
      metric: 'email_failure_rate',
      operator: '>',
      threshold: 10,
      timeWindow: 60
    },
    actions: [
      {
        type: 'email',
        target: 'admin@xiankuaiban.com',
        template: '系统警报: 邮件发送失败率过高'
      }
    ],
    enabled: true,
    createdAt: new Date()
  },
  {
    id: 'job_failure_rate',
    name: '定时任务失败率过高',
    description: '定时任务失败率超过20%',
    condition: {
      metric: 'job_failure_rate',
      operator: '>',
      threshold: 20,
      timeWindow: 30
    },
    actions: [
      {
        type: 'email',
        target: 'devops@xiankuaiban.com',
        template: '系统警报: 定时任务频繁失败'
      }
    ],
    enabled: true,
    createdAt: new Date()
  },
  {
    id: 'overdue_tasks_spike',
    name: '逾期任务激增',
    description: '逾期任务数量突然增加50%',
    condition: {
      metric: 'overdue_tasks_count',
      operator: '>',
      threshold: 50,
      timeWindow: 120
    },
    actions: [
      {
        type: 'email',
        target: 'project-manager@xiankuaiban.com',
        template: '项目警报: 逾期任务数量异常'
      }
    ],
    enabled: true,
    createdAt: new Date()
  }
]
```

#### 6.3.2 警报处理服务
```typescript
// supabase/functions/alert-processor/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // 获取当前的系统指标
    const metrics = await getCurrentMetrics(supabase)
    
    // 检查警报规则
    const triggeredAlerts = await checkAlertRules(supabase, metrics)
    
    // 处理触发的警报
    const processedAlerts = []
    for (const alert of triggeredAlerts) {
      const result = await processAlert(alert, metrics)
      processedAlerts.push(result)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        metrics,
        alerts_triggered: triggeredAlerts.length,
        alerts_processed: processedAlerts.length,
        details: processedAlerts
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getCurrentMetrics(supabase: any) {
  const { data, error } = await supabase
    .from('system_metrics')
    .select('*')
    .single()

  if (error) throw error

  // 计算额外指标
  const additionalMetrics = {
    email_failure_rate: data.emails_today > 0 ? (data.failed_emails_today / data.emails_today * 100) : 0,
    job_failure_rate: data.jobs_executed_today > 0 ? (data.failed_jobs_today / data.jobs_executed_today * 100) : 0,
    overdue_tasks_spike: data.overdue_tasks_today, // 这里应该比较历史数据
  }

  return { ...data, ...additionalMetrics }
}

async function checkAlertRules(supabase: any, metrics: any) {
  const { data: rules, error } = await supabase
    .from('alert_rules')
    .select('*')
    .eq('enabled', true)

  if (error) throw error

  const triggeredAlerts = []

  for (const rule of rules || []) {
    const currentValue = metrics[rule.condition.metric]
    if (currentValue === undefined) continue

    const conditionMet = evaluateCondition(currentValue, rule.condition.operator, rule.condition.threshold)
    
    if (conditionMet) {
      // 检查时间窗口内是否已触发过相同的警报
      const { data: recentAlerts } = await supabase
        .from('alert_logs')
        .select('id')
        .eq('rule_id', rule.id)
        .gte('created_at', new Date(Date.now() - rule.condition.timeWindow * 60 * 1000).toISOString())
        .limit(1)

      if (!recentAlerts || recentAlerts.length === 0) {
        triggeredAlerts.push(rule)
      }
    }
  }

  return triggeredAlerts
}

function evaluateCondition(value: number, operator: string, threshold: number): boolean {
  switch (operator) {
    case '>': return value > threshold
    case '<': return value < threshold
    case '>=': return value >= threshold
    case '<=': return value <= threshold
    case '=': return value === threshold
    default: return false
  }
}

async function processAlert(alert: any, metrics: any) {
  try {
    // 记录警报日志
    const alertLog = {
      rule_id: alert.id,
      rule_name: alert.name,
      triggered_value: metrics[alert.condition.metric],
      threshold: alert.condition.threshold,
      created_at: new Date().toISOString()
    }

    // 发送警报通知
    for (const action of alert.actions) {
      await sendAlertNotification(action, alert, metrics)
    }

    return {
      rule_id: alert.id,
      status: 'processed',
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    return {
      rule_id: alert.id,
      status: 'failed',
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

async function sendAlertNotification(action: any, alert: any, metrics: any) {
  const message = generateAlertMessage(alert, metrics)

  switch (action.type) {
    case 'email':
      await sendEmailAlert(action.target, alert.name, message)
      break
    case 'slack':
      await sendSlackAlert(action.target, message)
      break
    case 'webhook':
      await sendWebhookAlert(action.target, alert, metrics)
      break
  }
}

function generateAlertMessage(alert: any, metrics: any): string {
  return `
🚨 系统警报

警报名称: ${alert.name}
触发条件: ${alert.description}
当前值: ${metrics[alert.condition.metric]}
阈值: ${alert.condition.threshold}
时间: ${new Date().toLocaleString()}

详情请查看监控面板。
  `.trim()
}

async function sendEmailAlert(target: string, subject: string, message: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: '咸蛋快板监控 <alerts@xiankuaiban.com>',
      to: [target],
      subject: `[警报] ${subject}`,
      text: message,
    }),
  })

  if (!response.ok) {
    throw new Error(`邮件发送失败: ${response.statusText}`)
  }
}
```

## 7. 性能优化和扩展性考虑

### 7.1 数据库优化

#### 7.1.1 索引策略
```sql
-- 为统计数据查询创建复合索引
CREATE INDEX CONCURRENTLY idx_tasks_stats_composite 
ON tasks (project_id, status, created_at, due_date, assignee_id);

CREATE INDEX CONCURRENTLY idx_tasks_overdue 
ON tasks (due_date) WHERE status != 'completed';

CREATE INDEX CONCURRENTLY idx_tasks_assignee_date 
ON tasks (assignee_id, created_at, status);

-- 为邮件日志创建索引
CREATE INDEX CONCURRENTLY idx_email_logs_status_date 
ON email_logs (status, created_at);

-- 为定时任务执行日志创建索引
CREATE INDEX CONCURRENTLY idx_cron_jobs_time_status 
ON cron.job_run_details (start_time, status) WHERE status IN ('success', 'failed');

-- 分区表优化（按月分区邮件日志）
CREATE TABLE email_logs_partitioned (
    LIKE email_logs INCLUDING ALL
) PARTITION BY RANGE (created_at);

-- 创建月度分区
CREATE TABLE email_logs_2024_11 PARTITION OF email_logs_partitioned
    FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

CREATE TABLE email_logs_2024_12 PARTITION OF email_logs_partitioned
    FOR VALUES FROM ('2024-12-01') TO ('2025-01-01');
```

#### 7.1.2 查询优化
```sql
-- 预计算统计数据的物化视图
CREATE MATERIALIZED VIEW task_statistics_daily AS
SELECT 
  DATE(created_at) as stat_date,
  project_id,
  COUNT(*) as total_tasks,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_tasks,
  COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_tasks,
  COUNT(*) FILTER (WHERE due_date < CURRENT_DATE AND status != 'completed') as overdue_tasks,
  AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours
FROM tasks
GROUP BY DATE(created_at), project_id;

-- 创建刷新物化视图的函数
CREATE OR REPLACE FUNCTION refresh_task_statistics() 
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY task_statistics_daily;
END;
$$ LANGUAGE plpgsql;

-- 设置定时刷新
SELECT cron.schedule(
  'refresh-task-stats',
  '0 2 * * *',
  'SELECT refresh_task_statistics();'
);

-- 优化的统计查询
CREATE OR REPLACE FUNCTION get_fast_project_stats(
  p_project_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  p_end_date DATE DEFAULT CURRENT_DATE
) RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  -- 使用物化视图快速获取统计数据
  SELECT json_build_object(
    'period', p_start_date || ' to ' || p_end_date,
    'daily_stats', (
      SELECT json_agg(
        json_build_object(
          'date', stat_date,
          'total_tasks', total_tasks,
          'completed_tasks', completed_tasks,
          'in_progress_tasks', in_progress_tasks,
          'overdue_tasks', overdue_tasks,
          'completion_rate', CASE 
            WHEN total_tasks > 0 THEN ROUND((completed_tasks * 100.0 / total_tasks), 2)
            ELSE 0 
          END
        )
      )
      FROM task_statistics_daily
      WHERE project_id = p_project_id
        AND stat_date BETWEEN p_start_date AND p_end_date
      ORDER BY stat_date
    ),
    'summary', (
      SELECT json_build_object(
        'total_tasks', SUM(total_tasks),
        'completed_tasks', SUM(completed_tasks),
        'total_overdue_tasks', SUM(overdue_tasks),
        'avg_completion_hours', ROUND(AVG(avg_completion_hours), 2)
      )
      FROM task_statistics_daily
      WHERE project_id = p_project_id
        AND stat_date BETWEEN p_start_date AND p_end_date
    )
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 缓存策略

#### 7.2.1 Redis缓存实现
```typescript
// utils/cacheService.ts
interface CacheOptions {
  ttl?: number // 生存时间（秒）
  forceRefresh?: boolean
}

class CacheService {
  private redisUrl = Deno.env.get('REDIS_URL') || ''
  private defaultTTL = 300 // 5分钟

  async get<T>(key: string): Promise<T | null> {
    try {
      const redis = new Redis(this.redisUrl)
      const cached = await redis.get(key)
      await redis.close()
      
      return cached ? JSON.parse(cached) : null
    } catch (error) {
      console.warn('缓存读取失败:', error)
      return null
    }
  }

  async set<T>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    try {
      const redis = new Redis(this.redisUrl)
      const ttl = options.ttl || this.defaultTTL
      await redis.setex(key, ttl, JSON.stringify(value))
      await redis.close()
    } catch (error) {
      console.warn('缓存写入失败:', error)
    }
  }

  async invalidate(pattern: string): Promise<void> {
    try {
      const redis = new Redis(this.redisUrl)
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
      await redis.close()
    } catch (error) {
      console.warn('缓存失效失败:', error)
    }
  }

  // 带缓存的统计查询
  async getCachedStats(
    type: 'dashboard' | 'project' | 'team',
    params: Record<string, any>,
    options: CacheOptions = {}
  ): Promise<any> {
    const cacheKey = this.generateCacheKey(type, params)
    
    let stats = await this.get(cacheKey)
    
    if (!stats || options.forceRefresh) {
      stats = await this.fetchFreshStats(type, params)
      await this.set(cacheKey, stats, options)
    }
    
    return stats
  }

  private generateCacheKey(type: string, params: Record<string, any>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}:${params[key]}`)
      .join('|')
    
    return `stats:${type}:${sortedParams}`
  }

  private async fetchFreshStats(type: string, params: any): Promise<any> {
    const endpoint = `/functions/v1/stats-api/${type}`
    const queryString = new URLSearchParams(params).toString()
    const url = queryString ? `${endpoint}?${queryString}` : endpoint

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
    })

    if (!response.ok) {
      throw new Error(`获取统计数据失败: ${response.statusText}`)
    }

    const result = await response.json()
    return result.data
  }
}
```

#### 7.2.2 统计数据缓存层
```typescript
// supabase/functions/stats-cache/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  }

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const cacheService = new CacheService()

    switch (action) {
      case 'get':
        const cacheKey = url.searchParams.get('key')
        if (!cacheKey) {
          throw new Error('Cache key is required')
        }
        const cachedData = await cacheService.get(cacheKey)
        return new Response(
          JSON.stringify({ data: cachedData }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'set':
        const { key, value, ttl } = await req.json()
        await cacheService.set(key, value, { ttl })
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'invalidate':
        const pattern = url.searchParams.get('pattern')
        if (!pattern) {
          throw new Error('Pattern is required')
        }
        await cacheService.invalidate(pattern)
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      case 'refresh':
        // 刷新所有缓存的统计数据
        const refreshedKeys = await refreshAllStatsCache(supabase, cacheService)
        return new Response(
          JSON.stringify({ success: true, refreshed_keys: refreshedKeys }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function refreshAllStatsCache(supabase: any, cacheService: CacheService): Promise<string[]> {
  const refreshedKeys: string[] = []
  
  try {
    // 获取所有项目
    const { data: projects } = await supabase
      .from('projects')
      .select('id, name')

    if (projects) {
      for (const project of projects) {
        // 刷新项目统计数据
        const projectStatsKey = `stats:project:id:${project.id}`
        const projectStats = await getProjectStats(supabase, project.id)
        await cacheService.set(projectStatsKey, projectStats, { ttl: 600 }) // 10分钟
        
        // 刷新团队统计数据
        const teamStatsKey = `stats:team:project:${project.id}`
        const teamStats = await getTeamStats(supabase, project.id)
        await cacheService.set(teamStatsKey, teamStats, { ttl: 600 })
        
        refreshedKeys.push(projectStatsKey, teamStatsKey)
      }
    }

    // 刷新仪表板数据
    const dashboardKey = 'stats:dashboard:all'
    const dashboardStats = await getDashboardStats(supabase)
    await cacheService.set(dashboardKey, dashboardStats, { ttl: 300 }) // 5分钟
    
    refreshedKeys.push(dashboardKey)

    return refreshedKeys
  } catch (error) {
    console.error('刷新缓存失败:', error)
    return refreshedKeys
  }
}

async function getProjectStats(supabase: any, projectId: string): Promise<any> {
  const { data, error } = await supabase
    .rpc('get_task_statistics', {
      p_project_id: projectId,
      p_start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      p_end_date: new Date().toISOString().split('T')[0]
    })

  if (error) throw error
  return data
}
```

### 7.3 水平扩展架构

#### 7.3.1 微服务架构设计
```typescript
// 服务拆分策略
interface ServiceArchitecture {
  // 核心服务
  core: {
    tasks: string // 任务管理服务
    projects: string // 项目管理服务
    users: string // 用户管理服务
  }
  
  // 统计服务
  analytics: {
    stats_collector: string // 数据收集服务
    stats_processor: string // 数据处理服务
    report_generator: string // 报告生成服务
  }
  
  // 通知服务
  notifications: {
    email_service: string // 邮件发送服务
    template_engine: string // 模板引擎服务
    delivery_tracker: string // 投递跟踪服务
  }
  
  // 监控服务
  monitoring: {
    health_checker: string // 健康检查服务
    alert_processor: string // 警报处理服务
    metrics_collector: string // 指标收集服务
  }
}

// 服务发现和负载均衡
class ServiceRegistry {
  private services: Map<string, Array<{ url: string; weight: number; healthy: boolean }>> = new Map()

  register(serviceName: string, url: string, weight: number = 1) {
    const currentServices = this.services.get(serviceName) || []
    currentServices.push({ url, weight, healthy: true })
    this.services.set(serviceName, currentServices)
  }

  getService(serviceName: string): string | null {
    const services = this.services.get(serviceName) || []
    const healthyServices = services.filter(s => s.healthy)
    
    if (healthyServices.length === 0) {
      // 降级到所有服务（即使不健康）
      const fallbackServices = services.filter(s => !s.healthy)
      if (fallbackServices.length === 0) return null
      
      // 加权随机选择
      return this.weightedRandomSelect(fallbackServices)
    }
    
    // 加权随机选择健康服务
    return this.weightedRandomSelect(healthyServices)
  }

  private weightedRandomSelect(services: Array<{ url: string; weight: number }>): string {
    const totalWeight = services.reduce((sum, service) => sum + service.weight, 0)
    let random = Math.random() * totalWeight
    
    for (const service of services) {
      random -= service.weight
      if (random <= 0) {
        return service.url
      }
    }
    
    return services[0].url // 默认返回第一个
  }

  markServiceHealthy(serviceName: string, url: string, healthy: boolean) {
    const services = this.services.get(serviceName) || []
    const serviceIndex = services.findIndex(s => s.url === url)
    
    if (serviceIndex >= 0) {
      services[serviceIndex].healthy = healthy
      this.services.set(serviceName, services)
    }
  }
}
```

#### 7.3.2 异步处理队列
```typescript
// 队列系统实现
interface QueueMessage {
  id: string
  type: 'email' | 'report' | 'analytics' | 'notification'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  payload: any
  retryCount: number
  maxRetries: number
  scheduledAt: Date
  createdAt: Date
}

class AsyncQueue {
  private queue: Array<QueueMessage> = []
  private processing: Set<string> = new Set()
  private workers: Worker[] = []
  
  constructor(
    private db: any,
    private maxWorkers: number = 5,
    private pollInterval: number = 1000 // 1秒
  ) {
    this.startWorkers()
    this.startPolling()
  }

  async enqueue(message: Omit<QueueMessage, 'id' | 'createdAt' | 'retryCount'>): Promise<string> {
    const id = crypto.randomUUID()
    const queueMessage: QueueMessage = {
      ...message,
      id,
      retryCount: 0,
      createdAt: new Date()
    }

    // 保存到数据库
    await this.db
      .from('queue_messages')
      .insert({
        id: queueMessage.id,
        type: queueMessage.type,
        priority: queueMessage.priority,
        payload: queueMessage.payload,
        scheduled_at: queueMessage.scheduledAt.toISOString(),
        retry_count: queueMessage.retryCount,
        max_retries: queueMessage.maxRetries,
        status: 'pending'
      })

    return id
  }

  private async processMessage(message: QueueMessage): Promise<boolean> {
    if (this.processing.has(message.id)) {
      return false // 已经在处理中
    }

    this.processing.add(message.id)

    try {
      switch (message.type) {
        case 'email':
          await this.processEmail(message)
          break
        case 'report':
          await this.processReport(message)
          break
        case 'analytics':
          await this.processAnalytics(message)
          break
        case 'notification':
          await this.processNotification(message)
          break
        default:
          throw new Error(`Unknown message type: ${message.type}`)
      }

      // 标记为完成
      await this.markMessageCompleted(message.id)
      return true
    } catch (error) {
      console.error(`消息处理失败: ${message.id}`, error)
      
      if (message.retryCount < message.maxRetries) {
        await this.retryMessage(message)
      } else {
        await this.markMessageFailed(message.id, error.message)
      }
      
      return false
    } finally {
      this.processing.delete(message.id)
    }
  }

  private async processEmail(message: QueueMessage) {
    const emailService = new EmailService()
    await emailService.sendEmailWithRetry(message.payload)
  }

  private async processReport(message: QueueMessage) {
    const reportGenerator = new ReportGenerator()
    await reportGenerator.generateReport(message.payload)
  }

  private async processAnalytics(message: QueueMessage) {
    const analyticsProcessor = new AnalyticsProcessor()
    await analyticsProcessor.processAnalyticsData(message.payload)
  }

  private async processNotification(message: QueueMessage) {
    const notificationService = new NotificationService()
    await notificationService.sendNotification(message.payload)
  }

  private async retryMessage(message: QueueMessage) {
    const nextRetry = this.calculateNextRetry(message.retryCount)
    const updatedMessage = {
      ...message,
      retryCount: message.retryCount + 1,
      scheduledAt: nextRetry
    }

    await this.db
      .from('queue_messages')
      .update({
        retry_count: updatedMessage.retryCount,
        scheduled_at: updatedMessage.scheduledAt.toISOString(),
        status: 'pending'
      })
      .eq('id', message.id)
  }

  private calculateNextRetry(retryCount: number): Date {
    const delays = [1000, 5000, 15000, 60000, 300000] // 1秒, 5秒, 15秒, 1分钟, 5分钟
    const delay = delays[retryCount] || 300000
    return new Date(Date.now() + delay)
  }

  private async markMessageCompleted(messageId: string) {
    await this.db
      .from('queue_messages')
      .update({ status: 'completed', processed_at: new Date().toISOString() })
      .eq('id', messageId)
  }

  private async markMessageFailed(messageId: string, errorMessage: string) {
    await this.db
      .from('queue_messages')
      .update({ 
        status: 'failed', 
        error_message: errorMessage,
        processed_at: new Date().toISOString() 
      })
      .eq('id', messageId)
  }

  private startWorkers() {
    for (let i = 0; i < this.maxWorkers; i++) {
      const worker = new Worker(() => this.workerLoop(i))
      this.workers.push(worker)
    }
  }

  private async workerLoop(workerId: number) {
    while (true) {
      try {
        // 从数据库获取待处理消息
        const { data: messages } = await this.db
          .from('queue_messages')
          .select('*')
          .eq('status', 'pending')
          .lte('scheduled_at', new Date().toISOString())
          .order('priority', { ascending: false })
          .order('created_at', { ascending: true })
          .limit(1)

        if (messages && messages.length > 0) {
          const message = messages[0]
          await this.processMessage(message)
        }

        // 等待指定间隔
        await new Promise(resolve => setTimeout(resolve, this.pollInterval))
      } catch (error) {
        console.error(`Worker ${workerId} 错误:`, error)
        // 等待更长时间再重试
        await new Promise(resolve => setTimeout(resolve, 5000))
      }
    }
  }

  private startPolling() {
    // 定期清理过期消息和统计队列状态
    setInterval(() => {
      this.cleanup()
    }, 60000) // 每分钟清理一次
  }

  private async cleanup() {
    try {
      // 清理已完成的旧消息（保留30天）
      await this.db
        .from('queue_messages')
        .delete()
        .in('status', ['completed', 'failed'])
        .lt('processed_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      // 更新队列统计
      await this.updateQueueStats()
    } catch (error) {
      console.error('清理失败:', error)
    }
  }

  private async updateQueueStats() {
    const { data: stats } = await this.db
      .from('queue_messages')
      .select('status')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    if (stats) {
      const queueStats = {
        pending: stats.filter(s => s.status === 'pending').length,
        processing: stats.filter(s => s.status === 'processing').length,
        completed: stats.filter(s => s.status === 'completed').length,
        failed: stats.filter(s => s.status === 'failed').length,
        total: stats.length
      }

      // 保存统计数据
      await this.db
        .from('queue_stats')
        .upsert({
          date: new Date().toISOString().split('T')[0],
          ...queueStats
        })
    }
  }
}
```

### 7.4 容量规划和监控

#### 7.4.1 容量规划策略
```typescript
// 容量监控系统
interface CapacityMetrics {
  // 邮件发送能力
  email: {
    daily_limit: number
    hourly_limit: number
    current_usage: number
    utilization_rate: number
  }
  
  // 数据库性能
  database: {
    connections: number
    max_connections: number
    query_time_avg: number
    query_time_p95: number
    storage_usage: number
    storage_limit: number
  }
  
  // 队列处理能力
  queue: {
    pending_messages: number
    processing_rate: number
    avg_processing_time: number
    worker_utilization: number
  }
  
  // 缓存使用情况
  cache: {
    hit_rate: number
    memory_usage: number
    memory_limit: number
    eviction_rate: number
  }
}

class CapacityMonitor {
  async getCurrentMetrics(): Promise<CapacityMetrics> {
    const [
      emailMetrics,
      dbMetrics,
      queueMetrics,
      cacheMetrics
    ] = await Promise.all([
      this.getEmailMetrics(),
      this.getDatabaseMetrics(),
      this.getQueueMetrics(),
      this.getCacheMetrics()
    ])

    return {
      email: emailMetrics,
      database: dbMetrics,
      queue: queueMetrics,
      cache: cacheMetrics
    }
  }

  async getEmailMetrics(): Promise<CapacityMetrics['email']> {
    // 获取今日邮件发送统计
    const today = new Date().toISOString().split('T')[0]
    
    const { data: stats } = await supabase
      .from('email_logs')
      .select('status')
      .eq('created_at::date', today)

    const totalSent = stats?.length || 0
    const failedCount = stats?.filter(s => s.status === 'failed').length || 0
    const successCount = totalSent - failedCount

    // 假设的发送限制（需要根据实际邮件服务商调整）
    const dailyLimit = 10000
    const hourlyLimit = 1000

    return {
      daily_limit: dailyLimit,
      hourly_limit: hourlyLimit,
      current_usage: successCount,
      utilization_rate: (successCount / dailyLimit) * 100
    }
  }

  async getDatabaseMetrics(): Promise<CapacityMetrics['database']> {
    // 从PostgreSQL获取连接信息
    const { data: connectionStats } = await supabase.rpc('get_connection_stats')
    
    // 获取存储使用情况
    const dbSize = await this.getDatabaseSize()

    return {
      connections: connectionStats?.active_connections || 0,
      max_connections: connectionStats?.max_connections || 100,
      query_time_avg: connectionStats?.avg_query_time || 0,
      query_time_p95: connectionStats?.p95_query_time || 0,
      storage_usage: dbSize,
      storage_limit: this.getStorageLimit()
    }
  }

  async getQueueMetrics(): Promise<CapacityMetrics['queue']> {
    const { data: queueStats } = await supabase
      .from('queue_stats')
      .select('*')
      .eq('date', new Date().toISOString().split('T')[0])
      .single()

    const processingRate = queueStats ? 
      (queueStats.completed / (24 * 60)) * 60 : 0 // 每分钟处理数

    return {
      pending_messages: queueStats?.pending || 0,
      processing_rate: processingRate,
      avg_processing_time: queueStats?.avg_processing_time || 0,
      worker_utilization: (queueStats?.processing || 0) / this.maxWorkers * 100
    }
  }

  async getCacheMetrics(): Promise<CapacityMetrics['cache']> {
    // 这里需要根据实际使用的缓存系统实现
    return {
      hit_rate: 85.5,
      memory_usage: 256, // MB
      memory_limit: 512, // MB
      eviction_rate: 2.3
    }
  }

  // 容量规划建议
  async generateCapacityRecommendations(): Promise<string[]> {
    const metrics = await this.getCurrentMetrics()
    const recommendations: string[] = []

    // 邮件发送能力检查
    if (metrics.email.utilization_rate > 80) {
      recommendations.push('邮件发送接近日限额，建议升级邮件服务套餐或优化发送策略')
    }

    // 数据库连接检查
    const connectionUtilization = (metrics.database.connections / metrics.database.max_connections) * 100
    if (connectionUtilization > 80) {
      recommendations.push('数据库连接使用率过高，建议增加连接池大小或优化查询性能')
    }

    // 队列积压检查
    if (metrics.queue.pending_messages > 1000) {
      recommendations.push('消息队列积压较多，建议增加工作进程或优化处理逻辑')
    }

    // 缓存效率检查
    if (metrics.cache.hit_rate < 80) {
      recommendations.push('缓存命中率偏低，建议检查缓存策略和键设计')
    }

    // 存储空间检查
    const storageUtilization = (metrics.database.storage_usage / metrics.database.storage_limit) * 100
    if (storageUtilization > 85) {
      recommendations.push('存储空间使用率较高，建议清理历史数据或扩容存储')
    }

    if (recommendations.length === 0) {
      recommendations.push('系统运行正常，容量充足')
    }

    return recommendations
  }
}
```

#### 7.4.2 自动扩缩容
```typescript
// 自动扩缩容控制器
class AutoScaler {
  private readonly metrics: CapacityMonitor
  private readonly minWorkers = 2
  private readonly maxWorkers = 20
  private currentWorkers = 5

  constructor() {
    this.metrics = new CapacityMonitor()
    this.startMonitoring()
  }

  private startMonitoring() {
    // 每5分钟检查一次容量
    setInterval(() => {
      this.checkAndScale()
    }, 5 * 60 * 1000)
  }

  private async checkAndScale() {
    try {
      const capacityMetrics = await this.metrics.getCurrentMetrics()
      const scaleDecision = this.evaluateScalingNeeds(capacityMetrics)

      if (scaleDecision.action !== 'none') {
        await this.performScaling(scaleDecision)
      }
    } catch (error) {
      console.error('自动扩缩容检查失败:', error)
    }
  }

  private evaluateScalingNeeds(metrics: CapacityMetrics): ScaleDecision {
    const { queue, email } = metrics
    
    let action: 'scale_up' | 'scale_down' | 'none' = 'none'
    let reason = ''

    // 扩容条件
    if (queue.pending_messages > 500 && this.currentWorkers < this.maxWorkers) {
      action = 'scale_up'
      reason = `队列积压消息过多 (${queue.pending_messages})`
    } else if (email.utilization_rate > 90 && this.currentWorkers < this.maxWorkers) {
      action = 'scale_up'
      reason = '邮件发送量接近上限，需要提升处理能力'
    }

    // 缩容条件
    else if (queue.pending_messages < 50 && this.currentWorkers > this.minWorkers) {
      action = 'scale_down'
      reason = `队列负载较低 (${queue.pending_messages})，可以缩容`
    }

    return {
      action,
      targetWorkers: action === 'scale_up' ? 
        Math.min(this.currentWorkers + 2, this.maxWorkers) :
        Math.max(this.currentWorkers - 1, this.minWorkers),
      reason
    }
  }

  private async performScaling(decision: ScaleDecision) {
    const { action, targetWorkers, reason } = decision
    
    console.log(`执行${action === 'scale_up' ? '扩容' : '缩容'}: ${reason}`)
    
    try {
      if (action === 'scale_up') {
        await this.scaleUp(targetWorkers)
      } else {
        await this.scaleDown(targetWorkers)
      }
      
      this.currentWorkers = targetWorkers
      
      // 记录扩缩容事件
      await this.logScalingEvent(action, targetWorkers, reason)
    } catch (error) {
      console.error('扩缩容执行失败:', error)
    }
  }

  private async scaleUp(targetWorkers: number) {
    // 增加工作进程
    const currentWorkers = await this.getCurrentWorkerCount()
    const workersToAdd = targetWorkers - currentWorkers

    for (let i = 0; i < workersToAdd; i++) {
      await this.startNewWorker()
      console.log(`新增工作进程 #${currentWorkers + i + 1}`)
      // 避免启动过快
      await new Promise(resolve => setTimeout(resolve, 2000))
    }
  }

  private async scaleDown(targetWorkers: number) {
    // 优雅地停止工作进程
    const currentWorkers = await this.getCurrentWorkerCount()
    const workersToRemove = currentWorkers - targetWorkers

    for (let i = 0; i < workersToRemove; i++) {
      await this.gracefulStopWorker()
      console.log(`停止工作进程 #${currentWorkers - i}`)
      // 优雅关闭间隔
      await new Promise(resolve => setTimeout(resolve, 5000))
    }
  }

  private async getCurrentWorkerCount(): Promise<number> {
    // 实现获取当前工作进程数的逻辑
    return this.currentWorkers
  }

  private async startNewWorker(): Promise<void> {
    // 实现启动新工作进程的逻辑
    // 可能需要调用Supabase Edge Function或其他容器化方案
  }

  private async gracefulStopWorker(): Promise<void> {
    // 实现优雅停止工作进程的逻辑
  }

  private async logScalingEvent(action: string, targetWorkers: number, reason: string) {
    await supabase
      .from('scaling_events')
      .insert({
        action,
        target_workers: targetWorkers,
        reason,
        timestamp: new Date().toISOString()
      })
  }
}

interface ScaleDecision {
  action: 'scale_up' | 'scale_down' | 'none'
  targetWorkers: number
  reason: string
}
```

## 总结

本系统设计为"咸蛋快板"看板应用提供了一个完整的邮件提醒和统计解决方案，具有以下特点：

### 核心优势
1. **高度自动化** - 通过Supabase Cron Jobs实现定时任务自动化
2. **实时性** - WebSocket实时数据更新和状态同步
3. **可扩展性** - 微服务架构和异步处理队列设计
4. **可靠性** - 多层错误处理和重试机制
5. **监控完善** - 全方位的系统监控和健康检查

### 关键特性
- 📧 智能邮件提醒系统（任务到期、状态变更、优先级提醒）
- 📊 多维度统计分析（任务、项目、团队绩效）
- 📈 丰富的数据可视化（图表、仪表板、趋势分析）
- 🔄 自动化工作流（周报告、月总结、定期回顾）
- 🛡️ 完善监控体系（性能指标、健康检查、预警系统）
- ⚡ 高性能优化（缓存、分区、索引优化）
- 🔧 自动扩缩容（基于负载的弹性伸缩）

### 适用场景
- 中小型团队的日常项目管理
- 需要自动化邮件提醒的企业环境
- 追求数据驱动决策的项目团队
- 需要绩效分析和团队协作优化的组织

该系统设计充分考虑了实际业务需求、技术实现难度和维护成本，提供了一个既实用又先进的解决方案。