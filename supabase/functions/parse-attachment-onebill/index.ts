import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

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
      throw new Error('attachmentUrl is required');
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log('Fetching attachment:', attachmentUrl);

    // Fetch the attachment
    const fileResponse = await fetch(attachmentUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch attachment: ${fileResponse.status}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    const base64File = btoa(String.fromCharCode(...new Uint8Array(fileBuffer)));
    const contentType = fileResponse.headers.get('content-type') || 'image/jpeg';

    console.log('File fetched, size:', fileBuffer.byteLength, 'type:', contentType);

    const systemPrompt = `You are a utility bill parsing expert. 

Task
- Parse the attached customer bill (PDF or image) for Irish utilities.
- Some bills are bundles (e.g., electricity + gas). Disaggregate each utility and extract fields separately.
- Detect whether each service is present using strong signals (e.g., MPRN/MCC/DG ⇒ electricity; GPRN/carbon tax ⇒ gas; UAN/phone/broadband cues ⇒ broadband).

Output rules
- Return ONE JSON object only. No notes, no prose, no explanations.
- Use the exact keys and nesting shown below. Do not add or rename keys.
- Dates: "YYYY-MM-DD"; if unknown use "0000-00-00".
- Numeric rates/amounts/readings: numbers (double); if unknown use 0.
- Booleans: true/false (not strings).
- Currencies: "cent" or "euro".
- Standing charge period: "daily" or "annual".
- For supplier names, use the name as printed (e.g., Bord Gáis Energy, Community Power, Electric Ireland, Energia, Flogas, SSE Airtricity, Waterpower, Ecopower, Yuno energy).
- If a section does not exist for this bill, still return the section with sensible defaults (e.g., empty arrays, zero/placeholder values), keeping the schema intact.`;

    const userContent = [
      {
        type: "text",
        text: "Parse this utility bill and return the data in the specified JSON format."
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
        tools: [
          {
            type: "function",
            function: {
              name: "return_parsed_bill",
              description: "Return the parsed utility bill data",
              parameters: {
                type: "object",
                properties: {
                  bills: {
                    type: "object",
                    properties: {
                      cus_details: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            details: {
                              type: "object",
                              properties: {
                                customer_name: { type: "string" },
                                address: {
                                  type: "object",
                                  properties: {
                                    line_1: { type: "string" },
                                    line_2: { type: "string" },
                                    city: { type: "string" },
                                    county: { type: "string" },
                                    eircode: { type: "string" }
                                  }
                                }
                              }
                            },
                            services: {
                              type: "object",
                              properties: {
                                gas: { type: "boolean" },
                                broadband: { type: "boolean" },
                                electricity: { type: "boolean" }
                              }
                            }
                          }
                        }
                      },
                      electricity: { type: "array" },
                      gas: { type: "array" },
                      broadband: { type: "array" }
                    }
                  }
                },
                required: ["bills"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "return_parsed_bill" } }
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      }
      if (aiResponse.status === 402) {
        throw new Error('Payment required. Please add credits to your workspace.');
      }
      
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract the parsed data from tool call
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No tool call in AI response');
    }

    const parsedData = JSON.parse(toolCall.function.arguments);

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
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
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
