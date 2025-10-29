import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// In-memory cache for access tokens and media metadata
const tokenCache = new Map<string, { token: string; expires: number }>();
const mediaCache = new Map<string, { url: string; mimeType: string; size?: number; expires: number }>();

const TOKEN_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const MEDIA_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  let metadataTime = 0;
  let downloadTime = 0;

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

    // Get access token (with caching)
    const cacheKey = accountId || 'default';
    let accessToken: string | undefined;
    
    const cached = tokenCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) {
      accessToken = cached.token;
      console.log(`[Media Proxy] Token cache hit for ${cacheKey}`);
    } else {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      accessToken = Deno.env.get('WHATSAPP_ACCESS_TOKEN');
      
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

      if (accessToken) {
        tokenCache.set(cacheKey, {
          token: accessToken,
          expires: Date.now() + TOKEN_CACHE_TTL
        });
      }
    }

    if (!accessToken) {
      return new Response('No WhatsApp access token available', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    // Check media metadata cache
    const mediaCacheKey = `${mediaId}-${cacheKey}`;
    let mediaUrl: string;
    let mimeType: string;
    let fileSize: number | undefined;

    const cachedMedia = mediaCache.get(mediaCacheKey);
    if (cachedMedia && cachedMedia.expires > Date.now()) {
      mediaUrl = cachedMedia.url;
      mimeType = cachedMedia.mimeType;
      fileSize = cachedMedia.size;
      console.log(`[Media Proxy] Media metadata cache hit for ${mediaId}`);
    } else {
      // Fetch media metadata from WhatsApp
      const metadataStart = Date.now();
      const mediaResponse = await fetch(
        `https://graph.facebook.com/v18.0/${mediaId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );
      metadataTime = Date.now() - metadataStart;

      if (!mediaResponse.ok) {
        console.error('[Media Proxy] Failed to fetch media metadata:', await mediaResponse.text());
        return new Response('Failed to fetch media', { 
          status: 500, 
          headers: corsHeaders 
        });
      }

      const mediaData = await mediaResponse.json();
      mediaUrl = mediaData.url;
      mimeType = mediaData.mime_type || 'application/octet-stream';
      fileSize = mediaData.file_size;

      // Cache the metadata
      mediaCache.set(mediaCacheKey, {
        url: mediaUrl,
        mimeType,
        size: fileSize,
        expires: Date.now() + MEDIA_CACHE_TTL
      });
    }

    // Download the actual media file
    const downloadStart = Date.now();
    const fileResponse = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    downloadTime = Date.now() - downloadStart;

    if (!fileResponse.ok) {
      console.error('[Media Proxy] Failed to download media file');
      return new Response('Failed to download media', { 
        status: 500, 
        headers: corsHeaders 
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`[Media Proxy] mediaId=${mediaId}, total=${totalTime}ms, metadata=${metadataTime}ms, download=${downloadTime}ms, size=${fileSize || 'unknown'}`);

    // Stream the file back to the client with optimized headers
    const responseHeaders: Record<string, string> = {
      ...corsHeaders,
      'Content-Type': mimeType,
      'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
    };

    if (fileSize) {
      responseHeaders['Content-Length'] = fileSize.toString();
    }

    return new Response(fileResponse.body, {
      headers: responseHeaders,
    });

  } catch (error) {
    console.error('[Media Proxy] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
