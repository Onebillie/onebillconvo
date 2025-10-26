import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { backup, targetBusinessId, mode = 'merge' } = await req.json();

    if (!backup || !backup.version) {
      throw new Error('Invalid backup format');
    }

    const businessId = targetBusinessId || backup.businessId;

    // Verify user has access to target business
    const { data: businessAccess } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (!businessAccess || !['owner', 'admin'].includes(businessAccess.role)) {
      throw new Error('Insufficient permissions');
    }

    console.log(`Starting restore for business: ${businessId}, mode: ${mode}`);

    const restored = {
      customers: 0,
      conversations: 0,
      messages: 0,
      templates: 0,
      callRecords: 0,
      errors: []
    };

    // If mode is 'replace', delete existing data first
    if (mode === 'replace') {
      console.log('Clearing existing business data...');
      
      // Delete in reverse order of dependencies
      await supabase.from('messages').delete().eq('business_id', businessId);
      await supabase.from('campaign_recipients').delete().in('campaign_id', 
        (await supabase.from('marketing_campaigns').select('id').eq('business_id', businessId)).data?.map(c => c.id) || []
      );
      await supabase.from('marketing_campaigns').delete().eq('business_id', businessId);
      await supabase.from('conversations').delete().eq('business_id', businessId);
      await supabase.from('call_records').delete().eq('business_id', businessId);
      await supabase.from('tasks').delete().eq('business_id', businessId);
      await supabase.from('customers').delete().eq('business_id', businessId);
      await supabase.from('message_templates').delete().eq('business_id', businessId);
      await supabase.from('canned_responses').delete().eq('business_id', businessId);
      await supabase.from('custom_statuses').delete().eq('business_id', businessId);
      await supabase.from('ai_training_data').delete().eq('business_id', businessId);
      await supabase.from('ai_knowledge_documents').delete().eq('business_id', businessId);
      
      console.log('Existing data cleared');
    }

    // Restore customers
    if (backup.customers?.length > 0) {
      const customersToInsert = backup.customers.map(c => ({
        ...c,
        business_id: businessId,
        id: mode === 'merge' ? undefined : c.id, // Generate new IDs in merge mode
      }));

      const { data: insertedCustomers, error: customersError } = await supabase
        .from('customers')
        .insert(customersToInsert)
        .select();

      if (customersError) {
        console.error('Customers restore error:', customersError);
        restored.errors.push({ table: 'customers', error: customersError.message });
      } else {
        restored.customers = insertedCustomers?.length || 0;
      }
    }

    // Restore conversations
    if (backup.conversations?.length > 0) {
      const conversationsToInsert = backup.conversations.map(c => ({
        ...c,
        business_id: businessId,
        id: mode === 'merge' ? undefined : c.id,
      }));

      const { data: insertedConvs, error: convsError } = await supabase
        .from('conversations')
        .insert(conversationsToInsert)
        .select();

      if (convsError) {
        console.error('Conversations restore error:', convsError);
        restored.errors.push({ table: 'conversations', error: convsError.message });
      } else {
        restored.conversations = insertedConvs?.length || 0;
      }
    }

    // Restore messages
    if (backup.messages?.length > 0) {
      const messagesToInsert = backup.messages.map(m => ({
        ...m,
        business_id: businessId,
        id: mode === 'merge' ? undefined : m.id,
      }));

      const { data: insertedMsgs, error: msgsError } = await supabase
        .from('messages')
        .insert(messagesToInsert)
        .select();

      if (msgsError) {
        console.error('Messages restore error:', msgsError);
        restored.errors.push({ table: 'messages', error: msgsError.message });
      } else {
        restored.messages = insertedMsgs?.length || 0;
      }
    }

    // Restore templates
    if (backup.templates?.length > 0) {
      const templatesToInsert = backup.templates.map(t => ({
        ...t,
        business_id: businessId,
        id: mode === 'merge' ? undefined : t.id,
      }));

      const { data: insertedTemplates, error: templatesError } = await supabase
        .from('message_templates')
        .insert(templatesToInsert)
        .select();

      if (templatesError) {
        console.error('Templates restore error:', templatesError);
        restored.errors.push({ table: 'templates', error: templatesError.message });
      } else {
        restored.templates = insertedTemplates?.length || 0;
      }
    }

    // Restore canned responses
    if (backup.cannedResponses?.length > 0) {
      const { error: cannedError } = await supabase
        .from('canned_responses')
        .insert(backup.cannedResponses.map(c => ({
          ...c,
          business_id: businessId,
          id: mode === 'merge' ? undefined : c.id,
        })));

      if (cannedError) {
        restored.errors.push({ table: 'canned_responses', error: cannedError.message });
      }
    }

    // Restore custom statuses
    if (backup.customStatuses?.length > 0) {
      const { error: statusError } = await supabase
        .from('custom_statuses')
        .insert(backup.customStatuses.map(s => ({
          ...s,
          business_id: businessId,
          id: mode === 'merge' ? undefined : s.id,
        })));

      if (statusError) {
        restored.errors.push({ table: 'custom_statuses', error: statusError.message });
      }
    }

    // Restore call records
    if (backup.callRecords?.length > 0) {
      const callsToInsert = backup.callRecords.map(c => ({
        ...c,
        business_id: businessId,
        id: mode === 'merge' ? undefined : c.id,
      }));

      const { data: insertedCalls, error: callsError } = await supabase
        .from('call_records')
        .insert(callsToInsert)
        .select();

      if (callsError) {
        console.error('Call records restore error:', callsError);
        restored.errors.push({ table: 'call_records', error: callsError.message });
      } else {
        restored.callRecords = insertedCalls?.length || 0;
      }
    }

    // Restore AI training data
    if (backup.aiTraining?.length > 0) {
      const { error: aiError } = await supabase
        .from('ai_training_data')
        .insert(backup.aiTraining.map(a => ({
          ...a,
          business_id: businessId,
          id: mode === 'merge' ? undefined : a.id,
        })));

      if (aiError) {
        restored.errors.push({ table: 'ai_training_data', error: aiError.message });
      }
    }

    // Restore AI knowledge documents
    if (backup.aiDocs?.length > 0) {
      const { error: docsError } = await supabase
        .from('ai_knowledge_documents')
        .insert(backup.aiDocs.map(d => ({
          ...d,
          business_id: businessId,
          id: mode === 'merge' ? undefined : d.id,
        })));

      if (docsError) {
        restored.errors.push({ table: 'ai_knowledge_documents', error: docsError.message });
      }
    }

    // Restore tasks
    if (backup.tasks?.length > 0) {
      const { error: tasksError } = await supabase
        .from('tasks')
        .insert(backup.tasks.map(t => ({
          ...t,
          business_id: businessId,
          id: mode === 'merge' ? undefined : t.id,
        })));

      if (tasksError) {
        restored.errors.push({ table: 'tasks', error: tasksError.message });
      }
    }

    console.log(`Restore completed for business: ${businessId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        restored,
        hasErrors: restored.errors.length > 0
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Restore error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
