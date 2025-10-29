import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        auth: {
          persistSession: false,
        },
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { conversationId, departmentId, businessId, notes } = await req.json();

    if (!conversationId || !departmentId || !businessId) {
      throw new Error('Missing required fields');
    }

    console.log(`Notifying department ${departmentId} about conversation ${conversationId}`);

    // Get department details
    const { data: department, error: deptError } = await supabase
      .from('departments')
      .select('name')
      .eq('id', departmentId)
      .single();

    if (deptError) {
      throw deptError;
    }

    // Get conversation details
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .select(`
        id,
        customer:customers(name)
      `)
      .eq('id', conversationId)
      .single();

    if (convError) {
      throw convError;
    }

    // Get all users in the department
    const { data: departmentUsers, error: usersError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('department_id', departmentId);

    if (usersError) {
      throw usersError;
    }

    if (!departmentUsers || departmentUsers.length === 0) {
      console.log('No users in department');
      return new Response(
        JSON.stringify({ success: true, notified: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get assigner name
    const { data: assigner } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .single();

    const customerName = conversation?.customer?.name || 'Unknown Customer';
    const assignerName = assigner?.full_name || 'A team member';

    // Create InMail notifications for each department member
    const notifications = departmentUsers.map(member => ({
      business_id: businessId,
      sender_id: user.id,
      recipient_id: member.id,
      subject: `Conversation Assigned to ${department.name}`,
      content: `${assignerName} has assigned a conversation with ${customerName} to your department${notes ? `\n\nNotes: ${notes}` : ''}`,
      message_type: 'task_reminder',
      priority: 'normal',
      related_conversation_id: conversationId,
      metadata: { department_id: departmentId, assignment_type: 'department' }
    }));

    const { error: notifyError } = await supabase
      .from('internal_messages')
      .insert(notifications);

    if (notifyError) {
      console.error('Failed to create notifications:', notifyError);
      throw notifyError;
    }

    console.log(`Sent ${notifications.length} notifications to department members`);

    return new Response(
      JSON.stringify({ success: true, notified: notifications.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error notifying department:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
