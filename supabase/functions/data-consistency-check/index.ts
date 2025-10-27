import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const report = {
      normalized: 0,
      backfilled: 0,
      orphaned_attachments: 0,
      issues: [] as string[],
    };

    // 1. Normalize platform names
    const { data: messages } = await supabase
      .from('messages')
      .select('id, platform')
      .or('platform.eq.WhatsApp,platform.eq.Email,platform.eq.SMS');

    if (messages) {
      for (const msg of messages) {
        let normalized = msg.platform.toLowerCase();
        if (normalized !== msg.platform) {
          await supabase
            .from('messages')
            .update({ platform: normalized })
            .eq('id', msg.id);
          report.normalized++;
        }
      }
    }

    // 2. Fill missing business_id in messages
    const { data: missingBusinessId } = await supabase
      .from('messages')
      .select('id, conversation_id, conversations!inner(business_id)')
      .is('business_id', null)
      .limit(100);

    if (missingBusinessId) {
      for (const msg of missingBusinessId) {
        const businessId = (msg as any).conversations?.business_id;
        if (businessId) {
          await supabase
            .from('messages')
            .update({ business_id: businessId })
            .eq('id', msg.id);
          report.backfilled++;
        }
      }
    }

    // 3. Auto-populate customer names from whatsapp_name
    const { data: unnamedCustomers } = await supabase
      .from('customers')
      .select('id, name, whatsapp_name')
      .or('name.is.null,name.eq.')
      .not('whatsapp_name', 'is', null)
      .limit(100);

    if (unnamedCustomers) {
      for (const customer of unnamedCustomers) {
        if (customer.whatsapp_name) {
          const nameParts = customer.whatsapp_name.split(' ');
          await supabase
            .from('customers')
            .update({
              name: customer.whatsapp_name,
              first_name: nameParts[0],
              last_name: nameParts.slice(1).join(' ') || nameParts[0]
            })
            .eq('id', customer.id);
          report.backfilled++;
        }
      }
    }

    // 4. Check for orphaned attachments
    const { data: orphanedAttachments } = await supabase
      .from('message_attachments')
      .select('id, message_id, messages!inner(id)')
      .is('messages.id', null)
      .limit(10);

    if (orphanedAttachments && orphanedAttachments.length > 0) {
      report.orphaned_attachments = orphanedAttachments.length;
      report.issues.push(`Found ${orphanedAttachments.length} orphaned attachments`);
    }

    // 5. Check for conversations without messages
    const { data: emptyConversations } = await supabase
      .from('conversations')
      .select('id, messages(id)')
      .limit(100);

    if (emptyConversations) {
      const empty = emptyConversations.filter((c: any) => !c.messages || c.messages.length === 0);
      if (empty.length > 0) {
        report.issues.push(`Found ${empty.length} conversations with no messages`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        report,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Consistency check error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
