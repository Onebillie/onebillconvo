import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get account_id from query params or use default
    const url = new URL(req.url);
    const accountId = url.searchParams.get('account_id');

    let accessToken: string | null = null;
    let businessAccountId: string | null = null;

    if (accountId) {
      // Fetch specific account
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, business_account_id, is_active')
        .eq('id', accountId)
        .eq('is_active', true)
        .single();

      if (account) {
        accessToken = account.access_token;
        businessAccountId = account.business_account_id;
        console.log('Using specified WhatsApp account');
      }
    }

    // Fall back to default account if not found (deterministic)
    if (!accessToken || !businessAccountId) {
      const { data: defaultAccount } = await supabase
        .from('whatsapp_accounts')
        .select('access_token, business_account_id, is_active, created_at')
        .eq('is_default', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (defaultAccount) {
        accessToken = defaultAccount.access_token;
        businessAccountId = defaultAccount.business_account_id;
        console.log('Using default WhatsApp account for templates');
      }
    }

    if (!accessToken || !businessAccountId) {
      return new Response(
        JSON.stringify({ 
          error: 'No WhatsApp account configured. Please add a WhatsApp account in Settings > WA Accounts.',
          templates: []
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Fetch message templates from Meta's Graph API
    const templateUrl = `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`;
    
    console.log('Fetching templates from:', templateUrl);

    const response = await fetch(templateUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Meta API error:', errorText);
      throw new Error(`Failed to fetch templates: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log('Templates fetched successfully:', data.data?.length || 0);

    return new Response(
      JSON.stringify({ templates: data.data || [] }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error fetching templates:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});