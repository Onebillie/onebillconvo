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

    let contentType = 'image/jpeg';
    let base64File = '';

    // Handle data: URLs (from client-side conversion)
    if (attachmentUrl.startsWith('data:')) {
      console.log('Processing data URL...');
      const match = attachmentUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!match) {
        throw new Error('Invalid data URL format');
      }
      contentType = match[1];
      base64File = match[2];
      console.log('Data URL processed:', { type: contentType, size: base64File.length });
    } else {
      // Fetch from URL
      console.log('Fetching attachment...');
      const fileResponse = await fetch(attachmentUrl);
      if (!fileResponse.ok) {
        console.error('Failed to fetch attachment:', fileResponse.status);
        throw new Error(`Failed to fetch attachment: ${fileResponse.status}`);
      }

      const fileBuffer = await fileResponse.arrayBuffer();
      contentType = fileResponse.headers.get('content-type') || 'image/jpeg';
      
      // For PDFs, we need to use a different approach - convert to images first
      // For now, we'll use the URL directly for images only
      if (contentType === 'application/pdf') {
        throw new Error('PDF processing requires document parsing API. Please use image files (JPG, PNG) for now.');
      }
      
      // Convert to base64 in chunks to avoid stack overflow on large files
      const uint8Array = new Uint8Array(fileBuffer);
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < uint8Array.length; i += chunkSize) {
        const chunk = uint8Array.subarray(i, i + chunkSize);
        binaryString += String.fromCharCode(...chunk);
      }
      base64File = btoa(binaryString);

      console.log('File fetched successfully:', {
        size: fileBuffer.byteLength,
        type: contentType
      });
    }

    const systemPrompt = `You are a utility bill parsing expert for Irish utilities.

Extract data from the attached bill and return it in this exact JSON structure:

{
  "bills": {
    "cus_details": [
      {
        "details": {
          "customer_name": "string or null",
          "phone": "string (customer service or account phone)",
          "address": {
            "line_1": "string",
            "line_2": "string or null",
            "city": "string",
            "county": "string or null",
            "eircode": "string or null"
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
    "electricity": [
      {
        "electricity_details": {
          "meter_details": {
            "mprn": "string (11-digit MPRN number)",
            "mcc": "string or null (Meter Configuration Code)",
            "dg": "string or null (Day/Night or DG code)"
          },
          "bill_period": {
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null",
            "days": 0
          },
          "usage": {
            "day_units": 0,
            "night_units": 0,
            "total_units": 0,
            "unit": "kWh"
          },
          "charges": {
            "day_rate": 0.0,
            "night_rate": 0.0,
            "standing_charge": 0.0,
            "pso_levy": 0.0,
            "total_amount": 0.0,
            "currency": "euro"
          }
        }
      }
    ],
    "gas": [
      {
        "gas_details": {
          "meter_details": {
            "gprn": "string (7-digit GPRN number)"
          },
          "bill_period": {
            "start_date": "YYYY-MM-DD or null",
            "end_date": "YYYY-MM-DD or null",
            "days": 0
          },
          "usage": {
            "current_reading": 0,
            "previous_reading": 0,
            "units": 0,
            "unit": "m3 or kWh"
          },
          "charges": {
            "unit_rate": 0.0,
            "standing_charge": 0.0,
            "carbon_tax": 0.0,
            "total_amount": 0.0,
            "currency": "euro"
          }
        }
      }
    ],
    "broadband": [],
    "meter_reading": null
  }
}

CRITICAL RULES:
1. If you find an MPRN (11-digit number), this is an ELECTRICITY bill - populate the electricity array
2. If you find a GPRN (7-digit number), this is a GAS bill - populate the gas array
3. If this is just a photo of a physical meter (no bill), set meter_reading to null and leave electricity/gas empty
4. For bills: DO NOT populate meter_reading - use electricity or gas arrays instead
5. Phone number: Extract from customer details or customer service contact
6. Dates: Use YYYY-MM-DD format or null if not found
7. Numbers: Use 0 for unknown numeric values, null for unknown strings
8. Return ONLY valid JSON, no markdown, no explanation

ELECTRICITY BILL MARKERS:
- MPRN number (11 digits)
- MCC (Meter Configuration Code)
- DG code (Day/General)
- Day/Night rates
- PSO Levy
- kWh units

GAS BILL MARKERS:
- GPRN number (7 digits)
- Carbon tax
- m3 or kWh units for gas
- Standing charge

Extract ALL available data accurately.`;

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
