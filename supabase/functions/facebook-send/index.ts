import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { customerId, message, conversationId } = await req.json();

    if (!customerId || !message) {
      throw new Error('Missing required fields: customerId and message');
    }

    console.log('Sending Facebook message:', { customerId, message: message.substring(0, 50) });

    // Get customer with Facebook PSID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, business_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!customer.facebook_psid) {
      throw new Error('Customer does not have a Facebook PSID');
    }

    // Get Facebook account for this business
    const { data: fbAccount, error: fbError } = await supabase
      .from('facebook_accounts')
      .select('*')
      .eq('business_id', customer.business_id)
      .eq('is_active', true)
      .single();

    if (fbError || !fbAccount) {
      throw new Error('No active Facebook account found for this business');
    }

    // Send message via Facebook Graph API
    const graphApiUrl = `https://graph.facebook.com/v18.0/me/messages`;
    
    const payload = {
      recipient: {
        id: customer.facebook_psid,
      },
      message: {
        text: message,
      },
      messaging_type: 'RESPONSE',
    };

    console.log('Sending to Facebook API:', { url: graphApiUrl, psid: customer.facebook_psid });

    const response = await fetch(graphApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${fbAccount.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log('Facebook API response:', responseData);

    if (!response.ok) {
      throw new Error(`Facebook API error: ${JSON.stringify(responseData)}`);
    }

    // Store the sent message in the database
    const { data: storedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        customer_id: customerId,
        content: message,
        direction: 'outbound',
        platform: 'facebook',
        is_read: true,
        external_message_id: responseData.message_id,
        status: 'sent',
      })
      .select()
      .single();

    if (messageError) {
      console.error('Error storing message:', messageError);
      throw new Error('Failed to store message in database');
    }

    // Increment message count for billing
    await supabase.rpc('increment_message_count', {
      business_uuid: customer.business_id,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: responseData.message_id,
        storedMessage 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Facebook send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
