import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !businessAccountId) {
      throw new Error('WhatsApp credentials not configured');
    }

    // Fetch message templates from Meta's Graph API
    const url = `https://graph.facebook.com/v18.0/${businessAccountId}/message_templates`;
    
    console.log('Fetching templates from:', url);

    const response = await fetch(url, {
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