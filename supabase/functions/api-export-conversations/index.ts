import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = req.headers.get('x-api-key');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Missing API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Validate API key
    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key_hash', apiKey)
      .eq('is_active', true)
      .maybeSingle();
    
    if (keyError || !keyData) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', keyData.id);

    const url = new URL(req.url);
    const conversationId = url.searchParams.get('conversation_id');
    const customerId = url.searchParams.get('customer_id');
    const fromDate = url.searchParams.get('from_date');
    const toDate = url.searchParams.get('to_date');
    const format = url.searchParams.get('format') || 'json';
    const includeAttachments = url.searchParams.get('include_attachments') === 'true';

    // Build query
    let query = supabase
      .from('conversations')
      .select(`
        *,
        customers!inner(
          id,
          name,
          email,
          phone,
          business_id
        ),
        messages(
          id,
          content,
          subject,
          direction,
          platform,
          status,
          created_at,
          is_read,
          message_attachments(
            id,
            filename,
            type,
            size,
            url
          )
        )
      `)
      .eq('customers.business_id', keyData.business_id)
      .order('created_at', { ascending: false });

    if (conversationId) {
      query = query.eq('id', conversationId);
    }

    if (customerId) {
      query = query.eq('customer_id', customerId);
    }

    if (fromDate) {
      query = query.gte('created_at', fromDate);
    }

    if (toDate) {
      query = query.lte('created_at', toDate);
    }

    const { data: conversations, error: conversationsError } = await query;

    if (conversationsError) throw conversationsError;

    if (!conversations || conversations.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No conversations found' }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Process conversations
    const exportData = conversations.map(conv => ({
      conversation_id: conv.id,
      customer: {
        id: conv.customers.id,
        name: conv.customers.name,
        email: conv.customers.email,
        phone: conv.customers.phone,
      },
      status: conv.status,
      created_at: conv.created_at,
      updated_at: conv.updated_at,
      messages: conv.messages.map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        subject: msg.subject,
        direction: msg.direction,
        platform: msg.platform,
        status: msg.status,
        created_at: msg.created_at,
        is_read: msg.is_read,
        ...(includeAttachments && msg.message_attachments?.length > 0 && {
          attachments: msg.message_attachments.map((att: any) => ({
            id: att.id,
            filename: att.filename,
            type: att.type,
            size: att.size,
            url: att.url,
          }))
        })
      }))
    }));

    if (format === 'csv') {
      // Flatten to CSV format
      const csvRows: string[] = [];
      csvRows.push('Conversation ID,Customer Name,Customer Email,Customer Phone,Message ID,Direction,Platform,Content,Created At,Attachments');

      exportData.forEach(conv => {
        conv.messages.forEach((msg: any) => {
          const attachmentCount = msg.attachments?.length || 0;
          csvRows.push([
            conv.conversation_id,
            conv.customer.name,
            conv.customer.email || '',
            conv.customer.phone || '',
            msg.id,
            msg.direction,
            msg.platform,
            `"${msg.content.replace(/"/g, '""')}"`,
            msg.created_at,
            attachmentCount.toString(),
          ].join(','));
        });
      });

      return new Response(
        csvRows.join('\n'),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="conversations-export-${Date.now()}.csv"`,
          },
        }
      );
    }

    // Return JSON format
    return new Response(
      JSON.stringify({
        total_conversations: exportData.length,
        total_messages: exportData.reduce((sum, conv) => sum + conv.messages.length, 0),
        exported_at: new Date().toISOString(),
        conversations: exportData,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in api-export-conversations:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
