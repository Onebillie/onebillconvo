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
    const url = new URL(req.url);
    const mediaId = url.searchParams.get('mediaId');
    const accountId = url.searchParams.get('accountId');

    if (!mediaId) {
      return new Response('Missing mediaId parameter', { 
        status: 400, 
        headers: corsHeaders 
      });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get access token from account or default
    let accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
    
    if (accountId) {
      const { data: account } = await supabase
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('id', accountId)
        .eq('is_active', true)
        .maybeSingle();
      
      if (account?.access_token) {
        accessToken = account.access_token;
      }
    }

    if (!accessToken) {
      const { data: defaultAccount } = await supabase
        .from('whatsapp_accounts')
        .select('access_token')
        .eq('is_default', true)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (defaultAccount?.access_token) {
        accessToken = defaultAccount.access_token;
      }
    }

    if (!accessToken) {
      return new Response('No WhatsApp access token available', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Fetch media from WhatsApp
    const mediaResponse = await fetch(
      `https://graph.facebook.com/v18.0/${mediaId}`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!mediaResponse.ok) {
      console.error('Failed to fetch media metadata:', await mediaResponse.text());
      return new Response('Failed to fetch media', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const mediaData = await mediaResponse.json();
    const mediaUrl = mediaData.url;
    const mimeType = mediaData.mime_type || 'application/octet-stream';

    // Download the actual media file
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!fileResponse.ok) {
      console.error('Failed to download media file');
      return new Response('Failed to download media', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Stream the file back to the client with correct content type
    return new Response(fileResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': mimeType,
        'Cache-Control': 'public, max-age=3600',
      },
    });

  } catch (error) {
    console.error('Media proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
