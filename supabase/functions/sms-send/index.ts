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

    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { customer_id, content, conversation_id } = await req.json();

    if (!customer_id || !content) {
      throw new Error('Missing required fields');
    }

    // Get customer phone
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('phone, business_id')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer) {
      throw new Error('Customer not found');
    }

    // Get SMS account for this business
    const { data: smsAccount, error: smsError } = await supabase
      .from('sms_accounts')
      .select('*')
      .eq('business_id', customer.business_id)
      .eq('is_active', true)
      .limit(1)
      .single();

    if (smsError || !smsAccount) {
      throw new Error('No active SMS account configured');
    }

    // Check message limit
    const { data: business } = await supabase
      .from('businesses')
      .select('subscription_tier, message_count_current_period')
      .eq('id', customer.business_id)
      .single();

    if (business) {
      const limits: Record<string, number> = {
        free: 0,
        starter: 1000,
        professional: 10000,
        enterprise: 999999
      };
      const limit = limits[business.subscription_tier] || 0;

      if (business.message_count_current_period >= limit) {
        throw new Error(`Message limit reached. Upgrade your plan.`);
      }

      // Increment message count
      await supabase.rpc('increment_message_count', { business_uuid: customer.business_id });
    }

    // Send SMS via Twilio
    if (smsAccount.provider === 'twilio') {
      const accountSid = smsAccount.account_sid;
      const authToken = smsAccount.auth_token;
      
      const twilioResponse = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: customer.phone,
            From: smsAccount.phone_number,
            Body: content,
            StatusCallback: `${supabaseUrl}/functions/v1/sms-status-callback`,
          }),
        }
      );

      const twilioData = await twilioResponse.json();

      if (!twilioResponse.ok) {
        throw new Error(twilioData.message || 'Failed to send SMS');
      }

      // Insert message into database
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id,
          customer_id,
          content,
          direction: 'outbound',
          platform: 'sms',
          channel: 'sms',
          status: 'sent',
          is_read: true,
          business_id: customer.business_id,
          external_message_id: twilioData.sid,
        });

      if (insertError) {
        console.error('Error inserting message:', insertError);
      }

      return new Response(
        JSON.stringify({ success: true, sid: twilioData.sid }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error(`Provider ${smsAccount.provider} not yet supported`);

  } catch (error: any) {
    console.error('SMS send error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});