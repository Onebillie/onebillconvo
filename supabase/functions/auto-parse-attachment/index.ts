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
    const { messageId, attachmentId, attachmentUrl } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openaiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiKey) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Create pending parse result
    await supabase.from('attachment_parse_results').insert({
      message_id: messageId,
      attachment_id: attachmentId,
      parse_status: 'pending'
    });

    // Fetch the attachment
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      throw new Error('Failed to fetch attachment');
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    
    // Determine mime type
    const contentType = fileResponse.headers.get('content-type') || 'application/pdf';

    // Define comprehensive schema for utility bills and documents
    const jsonSchema = {
      type: "object",
      properties: {
        document_type: {
          type: "string",
          enum: [
            "electricity_bill", "gas_bill", "broadband_bill", "phone_bill",
            "electricity_meter", "gas_meter", "water_meter",
            "invoice", "receipt", "statement", "other"
          ]
        },
        bills: {
          type: "object",
          properties: {
            cus_details: { type: "array" },
            electricity: { type: "array" },
            gas: { type: "array" },
            broadband: { type: "array" },
            phone: { type: "array" },
            water: { type: "array" }
          }
        },
        meter_reading: {
          type: "object",
          properties: {
            reading_value: { type: "string" },
            reading_date: { type: "string" },
            meter_type: { type: "string" },
            meter_number: { type: "string" }
          }
        },
        confidence: { type: "number" }
      },
      required: ["document_type", "confidence"]
    };

    const prompt = `You are an AI document analyzer that processes utility bills, meter readings, and related documents.

Identify the document type and extract structured data:
- For bills: Extract customer details, account numbers, usage, charges, dates (YYYY-MM-DD format)
- For meter readings: Extract the reading value, date, meter number, and type
- All numerical values must be in double format or 0
- All dates must be in YYYY-MM-DD or 0000-00-00 format
- Provide a confidence score (0-1) for your analysis

Return ONLY structured JSON matching the schema. No explanations or notes.`;

    // Call OpenAI Vision API with structured output
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: prompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${contentType};base64,${fileBase64}`
                }
              }
            ]
          }
        ],
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: 'document_parser',
            schema: jsonSchema,
            strict: true
          }
        },
        max_tokens: 2000,
        temperature: 0
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API failed: ${response.status}`);
    }

    const result = await response.json();
    const parsedData = JSON.parse(result.choices[0].message.content);

    // Update parse result with success
    const { error: updateError } = await supabase
      .from('attachment_parse_results')
      .update({
        parse_status: 'success',
        document_type: parsedData.document_type,
        parsed_data: parsedData,
        updated_at: new Date().toISOString()
      })
      .eq('message_id', messageId)
      .eq('attachment_id', attachmentId);

    if (updateError) {
      console.error('Failed to update parse result:', updateError);
    }

    // Get message details for webhook
    const { data: message } = await supabase
      .from('messages')
      .select('*, customer:customers(*)')
      .eq('id', messageId)
      .single();

    if (message) {
      // Trigger webhook for parsed attachment
      const { data: webhooks } = await supabase
        .from('webhooks')
        .select('*')
        .eq('business_id', message.business_id)
        .eq('event', 'attachment.parsed')
        .eq('is_active', true);

      if (webhooks && webhooks.length > 0) {
        for (const webhook of webhooks) {
          const webhookPayload = {
            event: 'attachment.parsed',
            timestamp: new Date().toISOString(),
            data: {
              message_id: messageId,
              attachment_id: attachmentId,
              attachment_url: attachmentUrl,
              document_type: parsedData.document_type,
              parsed_data: parsedData,
              customer: message.customer,
              confidence: parsedData.confidence
            }
          };

          // Send webhook asynchronously
          fetch(webhook.url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Webhook-Signature': await generateSignature(webhookPayload, webhook.secret)
            },
            body: JSON.stringify(webhookPayload)
          }).catch(err => console.error('Webhook delivery failed:', err));
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        document_type: parsedData.document_type,
        parsed_data: parsedData 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Auto-parse error:', error);

    // Update parse result with failure
    const { messageId, attachmentId } = await req.json();
    if (messageId && attachmentId) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      await supabase
        .from('attachment_parse_results')
        .update({
          parse_status: 'failed',
          error_message: error.message,
          updated_at: new Date().toISOString()
        })
        .eq('message_id', messageId)
        .eq('attachment_id', attachmentId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function generateSignature(payload: any, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(payload));
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, data);
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}