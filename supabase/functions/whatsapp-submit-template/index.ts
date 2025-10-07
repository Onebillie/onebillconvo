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
    const { name, category, language, components, account_id } = await req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let accessToken: string | null = null;
    let businessAccountId: string | null = null;

    if (account_id) {
      // Fetch specific account
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, business_account_id, is_active')
        .eq('id', account_id)
        .eq('is_active', true)
        .single();

      if (account) {
        accessToken = account.access_token;
        businessAccountId = account.business_account_id;
        console.log('Using specified WhatsApp account');
      }
    }

    // Fall back to default account if not found
    if (!accessToken || !businessAccountId) {
      const { data: defaultAccount } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, business_account_id, is_active')
        .eq('is_default', true)
        .eq('is_active', true)
        .single();

      if (defaultAccount) {
        accessToken = defaultAccount.access_token;
        businessAccountId = defaultAccount.business_account_id;
        console.log('Using default WhatsApp account');
      }
    }

    if (!accessToken || !businessAccountId) {
      return new Response(
        JSON.stringify({ 
          error: 'No WhatsApp account configured. Please add a WhatsApp account in Settings > WA Accounts.' 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const response = await fetch(
      `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          category,
          language,
          components,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Meta API error:', data);
      throw new Error(data.error?.message || 'Failed to submit template');
    }

    console.log('Template submitted successfully:', data);

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error submitting template:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
