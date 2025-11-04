import "https://deno.land/x/xhr@0.1.0/mod.ts";
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
    const { fileUrl, fileName, businessId } = await req.json();

    if (!fileUrl || !fileName || !businessId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: fileUrl, fileName, businessId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[OPENAI-PARSE] Starting classification for: ${fileName}, business: ${businessId}`);

    // Check if business has OpenAI configured
    const { data: provider } = await supabase
      .from('ai_providers')
      .select('*')
      .eq('business_id', businessId)
      .eq('provider_name', 'openai')
      .eq('is_active', true)
      .maybeSingle();

    if (!provider || !provider.api_key) {
      return new Response(
        JSON.stringify({ 
          error: 'OpenAI not configured for this business. Please add OpenAI credentials in Settings > AI Assistant.',
          classification: 'unknown',
          confidence: 0,
          fields: {}
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch the file
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileSizeBytes = fileBuffer.byteLength;
    
    if (fileSizeBytes > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large for AI analysis (max 20MB)',
          classification: 'unknown',
          confidence: 0,
          fields: {}
        }),
        { status: 413, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[OPENAI-PARSE] Processing file: ${fileName}, size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
    
    // Convert to base64
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const mimeType = fileResponse.headers.get('content-type') || 
      (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    // Use OpenAI Vision API with structured output
    const model = provider.model || 'gpt-4o';
    
    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${provider.api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: `You are an expert document classifier for utility bills and meter readings. 

Analyze this document and:
1. Classify it as ONE of: "meter", "electricity", or "gas"
2. Extract ALL relevant fields with confidence scores (0-1)

CLASSIFICATION RULES:
- **meter**: Meter reading submission (dial photos, single reading number, phrases like "submit reading", NO invoice elements, NO supplier logos)
- **electricity**: Electricity bill (keywords: MPRN, MCC, DG, kWh, Electric Ireland, Bord Gáis Energy, SSE Airtricity, unit rate, standing charge, PSO levy)
- **gas**: Gas bill (keywords: GPRN, m³, therms, gas unit rate, gas standing charge, Flogas, Energia)

FIELD EXTRACTION (extract ALL that apply):
- **phone**: Customer phone number (convert to E.164 format, default to +353 prefix if Irish number)
- **mprn**: Electricity meter point reference (11 digits for Ireland, format: 10XXXXXXXXX)
- **gprn**: Gas point reference number (7-11 digits, may have hyphens/spaces)
- **mcc_type**: Market Customer Class type (e.g., "Domestic", "Standard", "Commercial")
- **dg_type**: Demand Group type (e.g., "Urban", "Rural", "Night Saver")
- **meter_reading**: The actual meter reading value (for meter submissions)
- **account_number**: Customer account number
- **address**: Service address`
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this document and classify it, then extract all relevant fields.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`,
                  detail: 'high'
                }
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'document_classification',
            strict: true,
            schema: {
              type: 'object',
              properties: {
                classification: {
                  type: 'string',
                  enum: ['electricity', 'gas', 'meter']
                },
                confidence: {
                  type: 'number',
                  description: 'Classification confidence 0-1'
                },
                fields: {
                  type: 'object',
                  properties: {
                    phone: { type: 'string' },
                    mprn: { type: 'string' },
                    gprn: { type: 'string' },
                    mcc_type: { type: 'string' },
                    dg_type: { type: 'string' },
                    meter_reading: { type: 'string' },
                    account_number: { type: 'string' },
                    address: { type: 'string' }
                  },
                  additionalProperties: false
                },
                field_confidence: {
                  type: 'object',
                  additionalProperties: {
                    type: 'number'
                  }
                },
                low_confidence_fields: {
                  type: 'array',
                  items: { type: 'string' }
                }
              },
              required: ['classification', 'confidence', 'fields', 'field_confidence', 'low_confidence_fields'],
              additionalProperties: false
            }
          }
        },
        max_tokens: 1000,
        temperature: 0.1
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[OPENAI-PARSE] OpenAI error (${aiResponse.status}):`, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'OpenAI rate limit reached. Please try again in a moment.',
            classification: 'unknown',
            confidence: 0,
            fields: {}
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`OpenAI classification failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;

    console.log('[OPENAI-PARSE] Classification response:', resultText);

    const classificationResult = JSON.parse(resultText);

    // Validate required fields
    if (!classificationResult.classification || !['meter', 'electricity', 'gas'].includes(classificationResult.classification)) {
      throw new Error('Invalid classification type returned');
    }

    console.log('[OPENAI-PARSE] Classification successful:', classificationResult.classification, 'confidence:', classificationResult.confidence);

    return new Response(
      JSON.stringify(classificationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[OPENAI-PARSE] Error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        classification: 'unknown',
        confidence: 0,
        fields: {},
        field_confidence: {},
        low_confidence_fields: []
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
