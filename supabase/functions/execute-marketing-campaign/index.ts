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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { campaign_id } = await req.json();

    console.log('Executing campaign:', campaign_id);

    // Get campaign details
    const { data: campaign, error: campaignError } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      throw new Error('Campaign not found');
    }

    // Update campaign status to sending
    await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'sending', 
        started_at: new Date().toISOString() 
      })
      .eq('id', campaign_id);

    // Get recipients based on filter
    const recipients = await getRecipients(supabase, campaign);

    console.log(`Found ${recipients.length} recipients for campaign`);

    // Create campaign_recipients records
    const recipientRecords = recipients.map(customer => ({
      campaign_id: campaign.id,
      customer_id: customer.id,
      status: 'pending'
    }));

    await supabase
      .from('campaign_recipients')
      .insert(recipientRecords);

    // Update recipient count
    await supabase
      .from('marketing_campaigns')
      .update({ recipient_count: recipients.length })
      .eq('id', campaign_id);

    // Process recipients in batches
    const BATCH_SIZE = 50;
    let processedCount = 0;
    let successCount = 0;
    let failedCount = 0;

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(async (customer) => {
          try {
            for (const channel of campaign.channels) {
              await sendCampaignMessage(
                supabase,
                campaign,
                customer,
                channel
              );
            }
            successCount++;
          } catch (error) {
            console.error(`Failed to send to customer ${customer.id}:`, error);
            failedCount++;
            
            // Update recipient as failed
            await supabase
              .from('campaign_recipients')
              .update({ 
                status: 'failed',
                error_message: error.message
              })
              .eq('campaign_id', campaign_id)
              .eq('customer_id', customer.id);
          }
        })
      );

      processedCount += batch.length;

      // Update campaign progress
      await supabase
        .from('marketing_campaigns')
        .update({ 
          sent_count: successCount,
          failed_count: failedCount
        })
        .eq('id', campaign_id);

      // Rate limiting: wait 1 second between batches
      if (i + BATCH_SIZE < recipients.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Mark campaign as completed
    await supabase
      .from('marketing_campaigns')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        sent_count: successCount,
        failed_count: failedCount
      })
      .eq('id', campaign_id);

    console.log(`Campaign ${campaign_id} completed: ${successCount} sent, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ 
        success: true,
        sent: successCount,
        failed: failedCount,
        total: recipients.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Campaign execution error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function getRecipients(supabase: any, campaign: any) {
  let query = supabase
    .from('customers')
    .select('*')
    .eq('business_id', campaign.business_id)
    .eq('is_unsubscribed', false);

  const filter = campaign.recipient_filter || {};

  // Apply status tag filters
  if (filter.statusTags && filter.statusTags.length > 0) {
    // Get conversations with these status tags
    const { data: conversations } = await supabase
      .from('conversation_statuses')
      .select('conversation_id')
      .in('status_tag_id', filter.statusTags);

    if (conversations) {
      const customerIds = await supabase
        .from('conversations')
        .select('customer_id')
        .in('id', conversations.map((c: any) => c.conversation_id));

      if (customerIds.data) {
        query = query.in('id', customerIds.data.map((c: any) => c.customer_id));
      }
    }
  }

  // Apply date filters
  if (filter.lastContactedAfter) {
    const { data: conversations } = await supabase
      .from('conversations')
      .select('customer_id')
      .gte('last_message_at', filter.lastContactedAfter);

    if (conversations) {
      query = query.in('id', conversations.map((c: any) => c.customer_id));
    }
  }

  const { data: customers } = await query;
  return customers || [];
}

async function sendCampaignMessage(
  supabase: any,
  campaign: any,
  customer: any,
  channel: string
) {
  // Render content with merge tags
  const content = renderMergeTags(campaign, customer, channel);

  // Get or create conversation
  const { data: existingConv } = await supabase
    .from('conversations')
    .select('id')
    .eq('customer_id', customer.id)
    .eq('business_id', campaign.business_id)
    .eq('channel', channel)
    .single();

  let conversationId = existingConv?.id;

  if (!conversationId) {
    const { data: newConv } = await supabase
      .from('conversations')
      .insert({
        customer_id: customer.id,
        business_id: campaign.business_id,
        channel: channel
      })
      .select()
      .single();

    conversationId = newConv.id;
  }

  // Create message
  const { data: message } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      content: content,
      direction: 'outbound',
      platform: channel,
      template_name: campaign.whatsapp_template_id,
      template_content: content,
      delivery_status: 'pending'
    })
    .select()
    .single();

  // Update campaign recipient with message_id
  await supabase
    .from('campaign_recipients')
    .update({ 
      message_id: message.id,
      sent_at: new Date().toISOString(),
      status: 'sent'
    })
    .eq('campaign_id', campaign.id)
    .eq('customer_id', customer.id);

  // Call appropriate send function
  const sendUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/${channel}-send`;
  
  await fetch(sendUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
    },
    body: JSON.stringify({
      message_id: message.id,
      conversation_id: conversationId,
      customer_id: customer.id,
      content: content
    })
  });

  return message;
}

function renderMergeTags(campaign: any, customer: any, channel: string): string {
  let content = '';
  
  switch (channel) {
    case 'whatsapp':
      content = campaign.whatsapp_variables?.body || '';
      break;
    case 'email':
      content = campaign.email_content || '';
      break;
    case 'sms':
      content = campaign.sms_content || '';
      break;
    case 'facebook':
      content = campaign.facebook_content || '';
      break;
    case 'instagram':
      content = campaign.instagram_content || '';
      break;
  }

  // Replace merge tags
  content = content
    .replace(/\{\{customer_name\}\}/g, customer.name || '')
    .replace(/\{\{first_name\}\}/g, customer.first_name || customer.name?.split(' ')[0] || '')
    .replace(/\{\{email\}\}/g, customer.email || '')
    .replace(/\{\{phone\}\}/g, customer.phone || '');

  return content;
}
