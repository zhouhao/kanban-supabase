import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Query reminders that need to be sent
    const now = new Date().toISOString()
    const { data: reminders, error: fetchError } = await supabase
      .from('reminders')
      .select('id, task_id, reminder_time')
      .eq('is_sent', false)
      .lte('reminder_time', now)
      .limit(10)

    if (fetchError) {
      throw fetchError
    }

    if (!reminders || reminders.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No pending reminders' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const sentReminders = []

    for (const reminder of reminders) {
      // Get task information
      const { data: task } = await supabase
        .from('tasks')
        .select('title, assignee_id, due_date')
        .eq('id', reminder.task_id)
        .maybeSingle()

      if (task && task.assignee_id) {
        // Get user email
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('id', task.assignee_id)
          .maybeSingle()

        if (profile) {
          // Call send email function
          const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email-reminder`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseKey}`
            },
            body: JSON.stringify({
              task_id: reminder.task_id,
              recipient_email: profile.email,
              task_title: task.title,
              due_date: task.due_date
            })
          })

          if (emailResponse.ok) {
            // Mark reminder as sent
            await supabase
              .from('reminders')
              .update({ is_sent: true, sent_at: new Date().toISOString() })
              .eq('id', reminder.id)

            sentReminders.push(reminder.id)
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        sent_count: sentReminders.length,
        reminder_ids: sentReminders
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Failed to check reminders:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})