import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, category, language, components } = await req.json();

    const accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    const businessAccountId = Deno.env.get('WHATSAPP_BUSINESS_ACCOUNT_ID');

    if (!accessToken || !businessAccountId) {
      throw new Error('WhatsApp credentials not configured');
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
