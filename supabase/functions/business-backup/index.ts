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

    const { businessId } = await req.json();

    // Verify user has access to this business
    const { data: businessAccess } = await supabase
      .from('business_users')
      .select('role')
      .eq('business_id', businessId)
      .eq('user_id', user.id)
      .single();

    if (!businessAccess || !['owner', 'admin'].includes(businessAccess.role)) {
      throw new Error('Insufficient permissions');
    }

    console.log(`Starting backup for business: ${businessId}`);

    // Fetch all business-related data
    const backup = {
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      businessId,
    };

    // Business core data
    const { data: business } = await supabase
      .from('businesses')
      .select('*')
      .eq('id', businessId)
      .single();
    backup.business = business;

    // Business settings
    const { data: businessSettings } = await supabase
      .from('business_settings')
      .select('*')
      .eq('id', businessId)
      .single();
    backup.businessSettings = businessSettings;

    // Customers
    const { data: customers } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', businessId);
    backup.customers = customers || [];

    // Conversations
    const { data: conversations } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId);
    backup.conversations = conversations || [];

    // Messages
    const { data: messages } = await supabase
      .from('messages')
      .select('*')
      .eq('business_id', businessId);
    backup.messages = messages || [];

    // Call records
    const { data: callRecords } = await supabase
      .from('call_records')
      .select('*')
      .eq('business_id', businessId);
    backup.callRecords = callRecords || [];

    // Templates
    const { data: templates } = await supabase
      .from('message_templates')
      .select('*')
      .eq('business_id', businessId);
    backup.templates = templates || [];

    // Canned responses
    const { data: cannedResponses } = await supabase
      .from('canned_responses')
      .select('*')
      .eq('business_id', businessId);
    backup.cannedResponses = cannedResponses || [];

    // Custom statuses
    const { data: customStatuses } = await supabase
      .from('custom_statuses')
      .select('*')
      .eq('business_id', businessId);
    backup.customStatuses = customStatuses || [];

    // AI training data
    const { data: aiTraining } = await supabase
      .from('ai_training_data')
      .select('*')
      .eq('business_id', businessId);
    backup.aiTraining = aiTraining || [];

    // AI knowledge documents
    const { data: aiDocs } = await supabase
      .from('ai_knowledge_documents')
      .select('*')
      .eq('business_id', businessId);
    backup.aiDocs = aiDocs || [];

    // AI assistant config
    const { data: aiConfig } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .eq('business_id', businessId)
      .single();
    backup.aiConfig = aiConfig;

    // AI providers
    const { data: aiProviders } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('business_id', businessId);
    backup.aiProviders = aiProviders || [];

    // Business users
    const { data: businessUsers } = await supabase
      .from('business_users')
      .select('*')
      .eq('business_id', businessId);
    backup.businessUsers = businessUsers || [];

    // Teams
    const { data: teams } = await supabase
      .from('teams')
      .select('*')
      .eq('business_id', businessId);
    backup.teams = teams || [];

    // Webhooks
    const { data: webhooks } = await supabase
      .from('webhook_subscriptions')
      .select('*')
      .eq('business_id', businessId);
    backup.webhooks = webhooks || [];

    // Marketing campaigns
    const { data: campaigns } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('business_id', businessId);
    backup.campaigns = campaigns || [];

    // Customer segments
    const { data: segments } = await supabase
      .from('customer_segments')
      .select('*')
      .eq('business_id', businessId);
    backup.segments = segments || [];

    // Tasks
    const { data: tasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('business_id', businessId);
    backup.tasks = tasks || [];

    // Embed tokens
    const { data: embedTokens } = await supabase
      .from('embed_tokens')
      .select('*')
      .eq('business_id', businessId);
    backup.embedTokens = embedTokens || [];

    console.log(`Backup completed for business: ${businessId}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        backup,
        stats: {
          customers: backup.customers.length,
          conversations: backup.conversations.length,
          messages: backup.messages.length,
          callRecords: backup.callRecords.length,
          templates: backup.templates.length,
        }
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
        } 
      }
    );

  } catch (error) {
    console.error('Backup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
