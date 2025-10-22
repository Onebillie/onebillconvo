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

    console.log('Sending Instagram message:', { customerId, message: message.substring(0, 50) });

    // Get customer with Instagram ID
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('*, business_id')
      .eq('id', customerId)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    if (!customer.instagram_id) {
      throw new Error('Customer does not have an Instagram ID');
    }

    // Get Instagram account for this business
    const { data: igAccount, error: igError } = await supabase
      .from('instagram_accounts')
      .select('*')
      .eq('business_id', customer.business_id)
      .eq('is_active', true)
      .single();

    if (igError || !igAccount) {
      throw new Error('No active Instagram account found for this business');
    }

    // Send message via Instagram Graph API (same endpoint as Facebook)
    const graphApiUrl = `https://graph.facebook.com/v18.0/me/messages`;
    
    const payload = {
      recipient: {
        id: customer.instagram_id,
      },
      message: {
        text: message,
      },
    };

    console.log('Sending to Instagram API:', { url: graphApiUrl, instagramId: customer.instagram_id });

    const response = await fetch(graphApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${igAccount.access_token}`,
      },
      body: JSON.stringify(payload),
    });

    const responseData = await response.json();
    console.log('Instagram API response:', responseData);

    if (!response.ok) {
      throw new Error(`Instagram API error: ${JSON.stringify(responseData)}`);
    }

    // Store the sent message in the database
    const { data: storedMessage, error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        customer_id: customerId,
        content: message,
        direction: 'outbound',
        platform: 'instagram',
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
    console.error('Instagram send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
