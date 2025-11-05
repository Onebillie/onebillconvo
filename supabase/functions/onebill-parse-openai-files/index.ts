import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ONEBILL_PROMPT = `You are an AI assistant specialized in extracting utility bill information for OneBill, an Irish utility management service.

Extract the following information from the provided document:

1. Customer Details:
   - customer_name
   - phone (Irish format, can be landline or mobile)
   - address (line_1, line_2, city, county, eircode)

2. Meter Reading (if present):
   - utility (gas/electricity/water)
   - read_value (numeric meter reading)
   - unit (m3 for gas, kWh for electricity)
   - meter_make (manufacturer)
   - meter_model
   - meter_serial
   - read_date (ISO format)
   - raw_text (the exact text shown on the meter display)

3. Electricity Bill (if present):
   - MPRN (Meter Point Reference Number)
   - MCC (Meter Configuration Code)
   - DG (Day/General or Day/Night indicator)

4. Gas Bill (if present):
   - GPRN (Gas Point Reference Number)

Return ONLY valid JSON in this exact structure:
{
  "bills": {
    "cus_details": [{
      "details": {
        "customer_name": "",
        "phone": "",
        "address": {
          "line_1": "",
          "line_2": "",
          "city": "",
          "county": "",
          "eircode": ""
        }
      }
    }],
    "meter_reading": {
      "utility": "",
      "read_value": "",
      "unit": "",
      "meter_make": "",
      "meter_model": "",
      "meter_serial": "",
      "read_date": "",
      "raw_text": ""
    },
    "electricity": [{
      "electricity_details": {
        "meter_details": {
          "mprn": "",
          "mcc": "",
          "dg": ""
        }
      }
    }],
    "gas": [{
      "gas_details": {
        "meter_details": {
          "gprn": ""
        }
      }
    }]
  }
}

Important:
- Only include sections with actual data found in the document
- If a field is not found, use empty string ""
- For meter readings, include ALL visible text from the meter display in raw_text
- Phone numbers should preserve Irish formatting (e.g., 0871234567 or +353871234567)`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentUrl, contentType, fileSize } = await req.json();

    if (!attachmentUrl) {
      return new Response(
        JSON.stringify({ error: 'attachmentUrl is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('OpenAI Files Parser: Starting parse for', contentType, 'size:', fileSize);

    // Get Lovable API key for PDF parsing (Lovable AI supports PDFs better than OpenAI vision)
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    
    if (!lovableApiKey) {
      return new Response(
        JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file
    console.log('Downloading file from:', attachmentUrl);
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to download file from URL',
          details: `HTTP ${fileResponse.status}: ${fileResponse.statusText}`,
          parse_source: 'openai_files_error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fileBlob = await fileResponse.blob();
    const fileSizeMB = (fileBlob.size / (1024 * 1024)).toFixed(2);
    console.log(`File downloaded, size: ${fileBlob.size} bytes (${fileSizeMB} MB)`);
    
    if (fileBlob.size > 20 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ 
          error: 'File too large for processing',
          details: `File size: ${fileSizeMB}MB. Maximum supported: 20MB`,
          parse_source: 'openai_files_error'
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to base64
    const arrayBuffer = await fileBlob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const base64 = btoa(String.fromCharCode(...uint8Array));
    
    console.log('File converted to base64');

    // Call Lovable AI (supports PDFs and images)
    console.log('Calling Lovable AI Gateway...');
    const chatResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash', // Gemini handles PDFs well
        messages: [
          {
            role: 'system',
            content: ONEBILL_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Please extract all utility bill information from this document. Return valid JSON only.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${contentType};base64,${base64}`
                }
              }
            ]
          }
        ],
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('Lovable AI error:', chatResponse.status, errorText);
      
      let errorDetails = errorText;
      try {
        const errorJson = JSON.parse(errorText);
        errorDetails = errorJson.error?.message || errorText;
      } catch {}
      
      if (chatResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'AI rate limit exceeded',
            details: 'Too many requests. Please try again in a few moments.',
            parse_source: 'lovable_ai_error'
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (chatResponse.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'AI payment required',
            details: 'Please check your Lovable AI credits.',
            parse_source: 'lovable_ai_error'
          }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ 
          error: 'AI could not parse this file',
          details: errorDetails,
          parse_source: 'lovable_ai_error',
          status_code: chatResponse.status
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 so router doesn't fail
      );
    }

    const chatResult = await chatResponse.json();
    console.log('AI response received');

    const content = chatResult.choices?.[0]?.message?.content;
    if (!content) {
      return new Response(
        JSON.stringify({ 
          error: 'AI returned empty response',
          details: 'No content was extracted from the document',
          parse_source: 'lovable_ai_error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 so router doesn't fail
      );
    }

    // Parse JSON from response (handle markdown code blocks)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    let parsedData;
    try {
      parsedData = JSON.parse(cleanedContent);
      console.log('Successfully parsed JSON from AI response');
    } catch (parseError) {
      console.error('Failed to parse AI response as JSON:', parseError);
      return new Response(
        JSON.stringify({ 
          error: 'AI response was not valid JSON',
          details: parseError instanceof Error ? parseError.message : 'JSON parsing failed',
          raw_content: content.substring(0, 500),
          parse_source: 'lovable_ai_error'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } } // Return 200 so router doesn't fail
      );
    }

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Lovable AI Files Parser uncaught error:', error);
    
    // Graceful error response - never crash the runtime
    return new Response(
      JSON.stringify({
        error: 'AI processing failed',
        details: error instanceof Error ? error.message : 'Unknown error occurred',
        parse_source: 'lovable_ai_error',
        stack: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
