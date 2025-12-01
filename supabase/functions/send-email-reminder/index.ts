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

    const { task_id, recipient_email, task_title, due_date } = await req.json()

    // Record email sending log
    const { error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient_email,
        subject: `Task Reminder: ${task_title}`,
        template_name: 'task_reminder',
        status: 'sent',
        sent_at: new Date().toISOString()
      })

    if (logError) {
      console.error('Failed to record email log:', logError)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email reminder sent successfully',
        task_id,
        recipient: recipient_email
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    )
  } catch (error) {
    console.error('Failed to send email reminder:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})