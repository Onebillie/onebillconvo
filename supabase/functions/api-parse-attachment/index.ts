import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const openAIKey = Deno.env.get('OPENAI_API_KEY');
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (!openAIKey) {
      return new Response(JSON.stringify({ error: 'OpenAI API key not configured' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'API key required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: keyData, error: keyError } = await supabase
      .from('api_keys')
      .select('business_id, active')
      .eq('key_prefix', apiKey.substring(0, 16))
      .single();

    if (keyError || !keyData || !keyData.active) {
      return new Response(JSON.stringify({ error: 'Invalid API key' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { attachment_url, schema, prompt } = await req.json();

    if (!attachment_url) {
      return new Response(JSON.stringify({ error: 'attachment_url required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the file
    const fileResponse = await fetch(attachment_url);
    if (!fileResponse.ok) {
      return new Response(JSON.stringify({ error: 'Failed to fetch attachment' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const fileBase64 = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const contentType = fileResponse.headers.get('content-type') || 'application/pdf';

    // Default schema if none provided
    const defaultSchema = {
      type: "object",
      properties: {
        extracted_data: {
          type: "object",
          properties: {
            text_content: { type: "string" },
            key_values: { type: "object" },
            entities: { type: "array", items: { type: "string" } }
          }
        }
      },
      required: ["extracted_data"]
    };

    const jsonSchema = schema || defaultSchema;

    const systemPrompt = prompt || 
      'You are a document parsing AI. Extract all relevant information from the provided document. ' +
      'Always output structured JSON using the exact keys and structure provided. ' +
      'All dates must be in YYYY-MM-DD format. ' +
      'All numerical values must be numbers, not strings. ' +
      'Do not include any notes or explanations — JSON output only.';

    // Call OpenAI with vision and structured output
    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: systemPrompt },
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
            name: 'document_schema',
            schema: jsonSchema,
            strict: true
          }
        },
        temperature: 0
      })
    });

    if (!openAIResponse.ok) {
      const errorText = await openAIResponse.text();
      console.error('OpenAI API error:', errorText);
      return new Response(JSON.stringify({ 
        error: 'OpenAI API call failed', 
        details: errorText 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const result = await openAIResponse.json();
    const parsedData = JSON.parse(result.choices[0].message.content);

    return new Response(JSON.stringify({ 
      success: true,
      parsed_data: parsedData,
      tokens_used: result.usage
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in api-parse-attachment:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
