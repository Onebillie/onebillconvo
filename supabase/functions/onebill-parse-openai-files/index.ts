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

    // Get OpenAI API key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Try to get business-specific OpenAI key from ai_providers table
    let openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    
    const { data: aiProvider } = await supabase
      .from('ai_providers')
      .select('api_key, is_active')
      .eq('business_id', 'f47ac10b-58cc-4372-a567-0e02b2c3d479')
      .eq('provider_name', 'openai')
      .eq('is_active', true)
      .single();

    if (aiProvider?.api_key) {
      console.log('Using business-specific OpenAI key from ai_providers');
      openaiApiKey = aiProvider.api_key;
    }

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured. Please add OPENAI_API_KEY to Supabase secrets or configure in ai_providers table.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Download the file
    console.log('Downloading file from:', attachmentUrl);
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to download file: ${fileResponse.statusText}`);
    }

    const fileBlob = await fileResponse.blob();
    console.log('File downloaded, size:', fileBlob.size);

    // Determine file extension from content type
    const extensionMap: Record<string, string> = {
      'application/pdf': 'pdf',
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/heic': 'heic',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
      'text/csv': 'csv',
    };

    const extension = extensionMap[contentType] || 'bin';
    const fileName = `onebill_document.${extension}`;

    // Upload to OpenAI Files API
    console.log('Uploading to OpenAI Files API...');
    const formData = new FormData();
    formData.append('file', fileBlob, fileName);
    formData.append('purpose', 'assistants');

    const uploadResponse = await fetch('https://api.openai.com/v1/files', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      console.error('OpenAI file upload error:', uploadResponse.status, errorText);
      throw new Error(`OpenAI file upload failed: ${errorText}`);
    }

    const uploadResult = await uploadResponse.json();
    const fileId = uploadResult.id;
    console.log('File uploaded to OpenAI, file_id:', fileId);

    // Call OpenAI Chat Completions with the file
    console.log('Calling OpenAI Chat Completions API...');
    const chatResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
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
                  url: `data:${contentType};base64,${btoa(String.fromCharCode(...new Uint8Array(await fileBlob.arrayBuffer())))}`
                }
              }
            ]
          }
        ],
        max_tokens: 2000,
        temperature: 0.1,
      }),
    });

    if (!chatResponse.ok) {
      const errorText = await chatResponse.text();
      console.error('OpenAI chat error:', chatResponse.status, errorText);
      
      if (chatResponse.status === 429) {
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (chatResponse.status === 402) {
        throw new Error('OpenAI payment required. Please check your OpenAI account.');
      }
      
      throw new Error(`OpenAI API error: ${errorText}`);
    }

    const chatResult = await chatResponse.json();
    console.log('OpenAI response received');

    const content = chatResult.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No content in OpenAI response');
    }

    // Parse JSON from response (handle markdown code blocks)
    let cleanedContent = content.trim();
    if (cleanedContent.startsWith('```json')) {
      cleanedContent = cleanedContent.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedContent.startsWith('```')) {
      cleanedContent = cleanedContent.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsedData = JSON.parse(cleanedContent);
    console.log('Successfully parsed JSON from OpenAI');

    // Clean up the uploaded file (optional, files auto-delete after 7 days)
    try {
      await fetch(`https://api.openai.com/v1/files/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
      });
      console.log('Cleaned up OpenAI file');
    } catch (cleanupError) {
      console.warn('Failed to cleanup OpenAI file:', cleanupError);
    }

    return new Response(
      JSON.stringify(parsedData),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OpenAI Files Parser error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
        parse_source: 'openai_files_error',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
