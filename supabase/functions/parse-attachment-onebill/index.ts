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
    const { attachmentUrl } = await req.json();
    console.log('Received request to parse:', attachmentUrl);

    if (!attachmentUrl) {
      throw new Error('attachmentUrl is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Fetching attachment...');
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      console.error('Failed to fetch attachment:', fileResponse.status);
      throw new Error(`Failed to fetch attachment: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow on large files
    const uint8Array = new Uint8Array(fileBuffer);
    let binaryString = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binaryString += String.fromCharCode(...chunk);
    }
    const base64File = btoa(binaryString);
    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';

    console.log('File fetched successfully:', {
      size: fileBuffer.byteLength,
      type: contentType
    });

    const systemPrompt = `You are a utility bill parsing expert for Irish utilities.

Extract data from the attached bill and return it in this exact JSON structure:

{
  "bills": {
    "cus_details": [
      {
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
        },
        "services": {
          "gas": false,
          "broadband": false,
          "electricity": false,
          "meter_reading": false
        }
      }
    ],
    "electricity": [...],
    "gas": [...],
    "broadband": [...],
    "meter_reading": {
      "utility": "gas" | "electricity",
      "read_value": 0,
      "unit": "m3" | "kWh",
      "meter_make": "",
      "meter_model": "",
      "meter_serial": "",
      "read_date": "YYYY-MM-DD",
      "raw_text": ""
    }
  }
}

Rules:
- Detect services: MPRN/MCC/DG = electricity, GPRN/carbon tax = gas, UAN/phone = broadband
- For meter readings: Extract meter make (e.g., "Landis+Gyr"), model (e.g., "L210"), reading value, unit (m3 for gas, kWh for electricity)
- Include raw_text from the meter reading area for audit purposes
- Extract phone number from customer details or bill contact info
- Dates: YYYY-MM-DD or 0000-00-00
- Numbers: use 0 for unknown
- Currency: "cent" or "euro"
- Return ONLY valid JSON, no markdown, no explanation`;

    const userContent = [
      {
        type: "text",
        text: "Parse this Irish utility bill and extract all data into the JSON format specified in the system prompt."
      },
      {
        type: "image_url",
        image_url: {
          url: `data:${contentType};base64,${base64File}`
        }
      }
    ];

    console.log('Calling Lovable AI Gateway...');

    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userContent }
        ],
        temperature: 0.1,
        response_format: { type: "json_object" }
      }),
    });

    console.log('AI Gateway response status:', aiResponse.status);

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error response:', errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status} - ${errorText}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received, parsing...');

    const content = aiData.choices?.[0]?.message?.content;
    if (!content) {
      console.error('No content in AI response:', JSON.stringify(aiData));
      throw new Error('No content in AI response');
    }

    console.log('Raw AI content:', content.substring(0, 200));

    // Try to parse the JSON, handling potential markdown wrapping
    let parsedData;
    try {
      // Remove markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedData = JSON.parse(cleanContent);
      console.log('Successfully parsed JSON data');
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
      console.error('Content that failed to parse:', content);
      throw new Error(`Failed to parse JSON response: ${parseError.message}`);
    }

    return new Response(
      JSON.stringify(parsedData),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in parse-attachment-onebill:', error);
    console.error('Error stack:', error.stack);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        details: error instanceof Error ? error.stack : undefined
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
