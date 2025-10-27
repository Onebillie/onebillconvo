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
    const { conversation_id, phone, days_back = 7 } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let results = {
      messages_found: 0,
      messages_recovered: 0,
      errors: [] as string[],
      customer_name: 'Unknown'
    };

    // Get conversation details
    let targetPhone = phone;
    let conversationId = conversation_id;
    let customerId: string | null = null;
    let businessId: string | null = null;

    if (conversation_id && !phone) {
      const { data: conv } = await supabase
        .from('conversations')
        .select('customer_id, business_id, customers!inner(phone, name)')
        .eq('id', conversation_id)
        .single();

      if (conv) {
        targetPhone = (conv as any).customers.phone;
        results.customer_name = (conv as any).customers.name || 'Unknown';
        customerId = conv.customer_id;
        businessId = conv.business_id;
      }
    }

    if (!targetPhone) {
      throw new Error('Phone number is required');
    }

    // Normalize phone (remove + and 00 prefix)
    const normalizedPhone = targetPhone.replace(/^\+/, '').replace(/^00/, '');

    // Get customer and conversation if not provided
    if (!conversationId) {
      const { data: customer } = await supabase
        .from('customers')
        .select('id, business_id, name')
        .eq('phone', normalizedPhone)
        .single();

      if (customer) {
        customerId = customer.id;
        businessId = customer.business_id;
        results.customer_name = customer.name || 'Unknown';

        // Get most recent conversation
        const { data: conv } = await supabase
          .from('conversations')
          .select('id')
          .eq('customer_id', customer.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();

        if (conv) {
          conversationId = conv.id;
        }
      }
    }

    if (!conversationId || !customerId || !businessId) {
      throw new Error('Could not find conversation or customer data');
    }

    // Get WhatsApp account credentials
    const { data: account } = await supabase
      .from('whatsapp_accounts')
      .select('access_token, phone_number_id, business_account_id')
      .eq('business_id', businessId)
      .eq('is_active', true)
      .single();

    if (!account || !account.business_account_id) {
      results.errors.push('No active WhatsApp Business Account found');
      return new Response(
        JSON.stringify({ success: false, results }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate date range
    const since = new Date();
    since.setDate(since.getDate() - days_back);
    const sinceTimestamp = Math.floor(since.getTime() / 1000);

    console.log(`Querying Meta API for messages to ${normalizedPhone} since ${since.toISOString()}`);

    // Query Meta Graph API for conversation messages
    // Note: This endpoint requires specific permissions and may not be available for all accounts
    const metaUrl = `https://graph.facebook.com/v21.0/${account.phone_number_id}/messages?access_token=${account.access_token}`;
    
    try {
      const metaResponse = await fetch(metaUrl);
      const metaData = await metaResponse.json();

      if (metaData.error) {
        results.errors.push(`Meta API error: ${metaData.error.message}`);
        console.error('Meta API error:', metaData.error);
      } else if (metaData.data) {
        results.messages_found = metaData.data.length;

        // Process each message from Meta
        for (const metaMsg of metaData.data) {
          // Check if message already exists in our DB
          const { data: existing } = await supabase
            .from('messages')
            .select('id')
            .eq('platform_message_id', metaMsg.id)
            .maybeSingle();

          if (!existing && metaMsg.timestamp >= sinceTimestamp) {
            // Insert missing message
            const { error: insertError } = await supabase
              .from('messages')
              .insert({
                conversation_id: conversationId,
                customer_id: customerId,
                business_id: businessId,
                content: metaMsg.text?.body || '[Message recovered from Meta API]',
                direction: 'outbound',
                platform: 'whatsapp',
                platform_message_id: metaMsg.id,
                status: 'sent',
                delivery_status: metaMsg.status || 'sent',
                is_read: true,
                created_at: new Date(metaMsg.timestamp * 1000).toISOString(),
                metadata: { 
                  recovered: true, 
                  recovered_from: 'meta_api',
                  recovery_date: new Date().toISOString()
                }
              });

            if (!insertError) {
              results.messages_recovered++;
              console.log(`Recovered message ${metaMsg.id} from Meta API`);
            } else {
              results.errors.push(`Failed to insert message ${metaMsg.id}: ${insertError.message}`);
            }
          }
        }
      }
    } catch (metaError: any) {
      results.errors.push(`Meta API request failed: ${metaError.message}`);
      console.error('Meta API request error:', metaError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        results,
        message: `Found ${results.messages_found} messages from Meta API, recovered ${results.messages_recovered} missing messages.`,
        note: results.errors.length > 0 ? 'Some errors occurred during recovery' : undefined
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Recovery error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error.message,
        note: 'Meta API message history may not be available for all WhatsApp Business accounts'
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
