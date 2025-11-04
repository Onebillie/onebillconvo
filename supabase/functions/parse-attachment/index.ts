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
    const { attachmentId, messageId, forceReparse = false } = await req.json();

    if (!attachmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: attachmentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`[PARSE-ATTACHMENT] Processing attachment ${attachmentId}, force: ${forceReparse}`);

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from('message_attachments')
      .select(`
        *,
        messages!inner(
          id,
          business_id,
          direction,
          businesses!inner(
            id,
            name,
            slug
          )
        )
      `)
      .eq('id', attachmentId)
      .single();

    if (attachmentError || !attachment) {
      throw new Error(`Attachment not found: ${attachmentError?.message}`);
    }

    const businessId = attachment.messages.business_id;
    const business = attachment.messages.businesses;

    // Check for existing parse result (unless force reparse)
    if (!forceReparse) {
      const { data: existingResult } = await supabase
        .from('attachment_parse_results')
        .select('*')
        .eq('attachment_id', attachmentId)
        .eq('parse_status', 'completed')
        .maybeSingle();

      if (existingResult) {
        console.log('[PARSE-ATTACHMENT] Returning cached result');
        return new Response(
          JSON.stringify({ 
            success: true, 
            cached: true,
            result: existingResult 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Check if OneBillChat business
    const isOneBillChat = 
      business.name?.toLowerCase().includes('onebill') || 
      business.slug?.toLowerCase().includes('onebill');

    console.log(`[PARSE-ATTACHMENT] Business: ${business.name}, IsOneBillChat: ${isOneBillChat}`);

    // Determine AI provider
    let aiProvider = 'lovable_ai';
    let apiKey: string | null = null;
    let model = 'google/gemini-2.5-flash';

    if (isOneBillChat) {
      // Check for OpenAI configuration
      const { data: openAIProvider } = await supabase
        .from('ai_providers')
        .select('*')
        .eq('business_id', businessId)
        .eq('provider_name', 'openai')
        .eq('is_active', true)
        .maybeSingle();

      if (openAIProvider?.api_key) {
        aiProvider = 'openai';
        apiKey = openAIProvider.api_key;
        model = openAIProvider.model || 'gpt-4o';
        console.log('[PARSE-ATTACHMENT] Using OpenAI for OneBillChat');
      } else {
        // Fallback to Lovable AI
        apiKey = Deno.env.get('LOVABLE_API_KEY');
        console.log('[PARSE-ATTACHMENT] OpenAI not configured, using Lovable AI');
      }
    } else {
      // Non-OneBillChat always uses Lovable AI
      apiKey = Deno.env.get('LOVABLE_API_KEY');
      console.log('[PARSE-ATTACHMENT] Using Lovable AI for non-OneBillChat business');
    }

    if (!apiKey) {
      throw new Error(`API key not available for provider: ${aiProvider}`);
    }

    // Update/create parse result status to 'processing'
    const { data: parseResult, error: upsertError } = await supabase
      .from('attachment_parse_results')
      .upsert({
        attachment_id: attachmentId,
        message_id: attachment.message_id,
        business_id: businessId,
        parse_status: 'processing',
        ai_provider: aiProvider,
        ai_model: model,
      }, {
        onConflict: 'attachment_id'
      })
      .select()
      .single();

    if (upsertError) {
      console.error('[PARSE-ATTACHMENT] Failed to update parse status:', upsertError);
    }

    // Fetch the file
    const fileResponse = await fetch(attachment.url);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileSizeBytes = fileBuffer.byteLength;
    
    if (fileSizeBytes > 20 * 1024 * 1024) {
      throw new Error('File too large for AI analysis (max 20MB)');
    }
    
    console.log(`[PARSE-ATTACHMENT] File: ${attachment.filename}, size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
    
    // Convert to base64
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const mimeType = attachment.type || 'image/jpeg';

    // Prepare classification prompt
    const systemPrompt = `You are an expert document classifier for utility bills and meter readings. 

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
- **address**: Service address

Return ONLY valid JSON.`;

    let classificationResult: any;

    // Call appropriate AI
    if (aiProvider === 'openai') {
      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this document and classify it, then extract all relevant fields.' },
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
                  classification: { type: 'string', enum: ['electricity', 'gas', 'meter'] },
                  confidence: { type: 'number' },
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
                  field_confidence: { type: 'object', additionalProperties: { type: 'number' } },
                  low_confidence_fields: { type: 'array', items: { type: 'string' } }
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
        throw new Error(`OpenAI error: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      classificationResult = JSON.parse(aiData.choices[0].message.content);
      classificationResult.tokens_used = aiData.usage?.total_tokens || 0;
    } else {
      // Lovable AI
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            {
              role: 'user',
              content: [
                { type: 'text', text: 'Analyze this document and provide classification and field extraction in JSON format.' },
                {
                  type: 'image_url',
                  image_url: { url: `data:${mimeType};base64,${base64File}` }
                }
              ]
            }
          ],
          max_tokens: 1000,
          temperature: 0.3,
        }),
      });

      if (!aiResponse.ok) {
        const errorText = await aiResponse.text();
        throw new Error(`Lovable AI error: ${errorText}`);
      }

      const aiData = await aiResponse.json();
      const resultText = aiData.choices[0].message.content;
      
      // Extract JSON from response
      const jsonMatch = resultText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || resultText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[1] : resultText;
      classificationResult = JSON.parse(jsonText);
      classificationResult.tokens_used = aiData.usage?.total_tokens || 0;
    }

    console.log(`[PARSE-ATTACHMENT] Classification: ${classificationResult.classification}, confidence: ${classificationResult.confidence}`);

    // Store parse results
    const { error: updateError } = await supabase
      .from('attachment_parse_results')
      .update({
        parse_status: 'completed',
        document_type: classificationResult.classification,
        classification_confidence: classificationResult.confidence,
        extracted_fields: classificationResult.fields || {},
        field_confidence: classificationResult.field_confidence || {},
        low_confidence_fields: classificationResult.low_confidence_fields || [],
        tokens_used: classificationResult.tokens_used,
        parsed_at: new Date().toISOString(),
        parse_error: null,
      })
      .eq('attachment_id', attachmentId);

    if (updateError) {
      console.error('[PARSE-ATTACHMENT] Failed to update parse results:', updateError);
    }

    // If utility document and OneBillChat, create submission
    if (isOneBillChat && ['meter', 'electricity', 'gas'].includes(classificationResult.classification)) {
      console.log('[PARSE-ATTACHMENT] Creating OneBill submission');
      
      // Check if submission already exists
      const { data: existingSubmission } = await supabase
        .from('onebill_submissions')
        .select('id')
        .eq('attachment_id', attachmentId)
        .maybeSingle();

      if (!existingSubmission) {
        await supabase
          .from('onebill_submissions')
          .insert({
            attachment_id: attachmentId,
            message_id: attachment.message_id,
            business_id: businessId,
            document_type: classificationResult.classification,
            extracted_fields: classificationResult.fields || {},
            classification_confidence: classificationResult.confidence,
            status: 'pending',
          });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        result: classificationResult
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PARSE-ATTACHMENT] Error:', error);
    
    // Update parse status to failed if we have attachmentId
    try {
      const { attachmentId } = await req.json();
      if (attachmentId) {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        await supabase
          .from('attachment_parse_results')
          .update({
            parse_status: 'failed',
            parse_error: error.message,
          })
          .eq('attachment_id', attachmentId);
      }
    } catch (updateError) {
      console.error('[PARSE-ATTACHMENT] Failed to update error status:', updateError);
    }

    return new Response(
      JSON.stringify({ 
        success: false,
        error: error.message
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
