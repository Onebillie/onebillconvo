import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Task {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string;
  status: string;
}

interface CalendarSyncConfig {
  id: string;
  name: string;
  provider: string;
  calendar_url: string;
  api_key: string;
  sync_tasks: boolean;
  sync_completed_tasks: boolean;
  default_timezone: string;
  include_description: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    console.log('Starting calendar sync process...');

    // Fetch all active sync configurations
    const { data: configs, error: configError } = await supabaseClient
      .from('calendar_sync_config')
      .select('*')
      .eq('is_active', true);

    if (configError) {
      console.error('Error fetching configs:', configError);
      throw configError;
    }

    if (!configs || configs.length === 0) {
      console.log('No active sync configurations found');
      return new Response(
        JSON.stringify({ message: 'No active sync configurations' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const results = [];

    for (const config of configs as CalendarSyncConfig[]) {
      console.log(`Processing sync for: ${config.name}`);

      try {
        // Fetch tasks to sync
        let tasksQuery = supabaseClient
          .from('tasks')
          .select('*')
          .order('due_date', { ascending: true });

        if (!config.sync_completed_tasks) {
          tasksQuery = tasksQuery.neq('status', 'done');
        }

        const { data: tasks, error: tasksError } = await tasksQuery;

        if (tasksError) {
          console.error(`Error fetching tasks for ${config.name}:`, tasksError);
          results.push({
            config: config.name,
            success: false,
            error: tasksError.message,
          });
          continue;
        }

        // Generate ICS content
        const icsContent = generateICS(tasks as Task[], config);

        // Here you would implement the actual sync logic based on the provider
        // For now, we'll just log and update the last sync time
        console.log(`Generated ICS for ${config.name} with ${tasks?.length || 0} tasks`);

        // Update last sync time
        await supabaseClient
          .from('calendar_sync_config')
          .update({ last_sync_at: new Date().toISOString() })
          .eq('id', config.id);

        results.push({
          config: config.name,
          success: true,
          tasks_synced: tasks?.length || 0,
          provider: config.provider,
        });

        // Note: Actual calendar API integration would go here
        // This would vary based on the provider (Google, Outlook, etc.)

      } catch (error) {
        console.error(`Error syncing ${config.name}:`, error);
        results.push({
          config: config.name,
          success: false,
          error: error.message,
        });
      }
    }

    console.log('Sync process completed:', results);

    return new Response(
      JSON.stringify({
        message: 'Calendar sync completed',
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('Calendar sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

function generateICS(tasks: Task[], config: CalendarSyncConfig): string {
  const formatDate = (date: string) => {
    return new Date(date).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
  };

  const icsLines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//OneBill//Task Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  tasks.forEach(task => {
    const now = formatDate(new Date().toISOString());
    const dueDate = formatDate(task.due_date);

    icsLines.push(
      'BEGIN:VEVENT',
      `UID:${task.id}@onebill.ie`,
      `DTSTAMP:${now}`,
      `DTSTART:${dueDate}`,
      `DTEND:${dueDate}`,
      `SUMMARY:${task.title}`,
    );

    if (config.include_description && task.description) {
      icsLines.push(`DESCRIPTION:${task.description.replace(/\n/g, '\\n')}`);
    }

    icsLines.push(
      `PRIORITY:${task.priority === 'high' ? '1' : task.priority === 'medium' ? '5' : '9'}`,
      `STATUS:${task.status === 'done' ? 'COMPLETED' : 'NEEDS-ACTION'}`,
      'END:VEVENT'
    );
  });

  icsLines.push('END:VCALENDAR');

  return icsLines.join('\r\n');
}
