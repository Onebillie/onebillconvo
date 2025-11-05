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
    const { attachmentUrl } = await req.json();

    if (!attachmentUrl) {
      return new Response(
        JSON.stringify({ error: 'attachmentUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Router: Processing attachment:', attachmentUrl);

    let contentType = '';
    let fileSize = 0;

    // Handle data: URLs (from client-side conversion)
    if (attachmentUrl.startsWith('data:')) {
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        contentType = match[1];
        const base64Data = match[2];
        fileSize = Math.ceil(base64Data.length * 0.75); // Approximate size from base64
        console.log('Router: Data URL detected, type:', contentType, 'approx size:', fileSize);
      } else {
        throw new Error('Invalid data URL format');
      }
    } else {
      // Fetch the file to determine MIME type
      console.log('Router: Fetching attachment to detect MIME type:', attachmentUrl);
      const fileResponse = await fetch(attachmentUrl);
      if (!fileResponse.ok) {
        throw new Error(`Failed to fetch attachment: ${fileResponse.statusText}`);
      }

      contentType = fileResponse.headers.get('content-type') || '';
      const blob = await fileResponse.blob();
      fileSize = blob.size;
      console.log('Router: Detected content-type:', contentType, 'size:', fileSize);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let routerDecision = '';
    let parseResult;

    // Route based on content type
    if (contentType.includes('image/') && !contentType.includes('heic')) {
      // Images (jpeg, png, webp) -> use existing parse-attachment-onebill (Lovable AI/Gemini)
      console.log('Router: Routing to parse-attachment-onebill (Gemini for images)');
      routerDecision = 'gemini-image';

      const response = await supabase.functions.invoke('parse-attachment-onebill', {
        body: { attachmentUrl }
      });

      if (response.error) {
        console.error('Router: Gemini parse returned error:', response.error);
        parseResult = {
          error: response.error.message || 'Gemini parse failed',
          details: response.error,
          parse_source: 'router_forwarded_gemini'
        };
      } else {
        parseResult = response.data;
      }

    } else if (contentType.includes('pdf')) {
      // PDFs require client-side conversion to image first
      console.log('Router: PDF detected, returning conversion required message');
      routerDecision = 'requires_client_pdf_conversion';
      
      parseResult = {
        error: 'unsupported_input',
        details: 'PDF must be converted to JPEG on client before parsing. Open the attachment and click Parse to convert and parse.',
        parse_source: 'router',
        _router: {
          decision: 'requires_client_pdf_to_jpeg',
          contentType,
          fileSize
        }
      };
    } else {
      // Other document types (Office, CSV, HEIC) are not supported
      console.log('Router: Unsupported document type:', contentType);
      routerDecision = 'unsupported_type';
      
      parseResult = {
        error: 'unsupported_input',
        details: `Document type ${contentType} is not supported. Please convert to JPG/PNG or upload the original PDF.`,
        parse_source: 'router',
        _router: {
          decision: 'unsupported_type',
          contentType,
          fileSize
        }
      };
    }

    // Add router metadata to result
    const result = {
      ...parseResult,
      _router: {
        decision: routerDecision,
        contentType,
        fileSize
      }
    };

    console.log('Router: Parse successful via', routerDecision);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Router error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        parse_source: 'router_error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
