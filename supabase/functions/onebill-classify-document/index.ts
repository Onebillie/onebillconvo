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

    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    console.log(`Classifying document: ${fileName} for business: ${businessId}`);

    // Fetch the file to analyze
    const fileResponse = await fetch(fileUrl);
    if (!fileResponse.ok) {
      throw new Error(`Failed to fetch file: ${fileResponse.statusText}`);
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Convert to base64 in chunks to avoid stack overflow on large files
    const uint8Array = new Uint8Array(fileBuffer);
    let binary = '';
    const chunkSize = 8192;
    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.subarray(i, i + chunkSize);
      binary += String.fromCharCode.apply(null, Array.from(chunk));
    }
    const base64File = btoa(binary);
    
    const mimeType = fileResponse.headers.get('content-type') || 'image/jpeg';

    // Classification and extraction prompt
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

Return ONLY valid JSON in this exact format:
{
  "classification": "electricity" | "gas" | "meter",
  "confidence": 0.95,
  "fields": {
    "phone": "+353871234567",
    "mprn": "10012345678",
    "mcc_type": "Standard",
    "dg_type": "Urban",
    "account_number": "ACC123456",
    "address": "123 Main St, Dublin"
  },
  "field_confidence": {
    "phone": 0.9,
    "mprn": 0.95,
    "mcc_type": 0.7,
    "dg_type": 0.6
  },
  "low_confidence_fields": ["mcc_type", "dg_type"]
}`;

    // Call Lovable AI Gateway (Gemini)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this document and provide classification and field extraction in the required JSON format.',
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:${mimeType};base64,${base64File}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`AI classification failed: ${aiResponse.statusText}`);
    }

    const aiData = await aiResponse.json();
    const resultText = aiData.choices[0].message.content;

    console.log('AI classification response:', resultText);

    // Parse the JSON response
    let classificationResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = resultText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || 
                       resultText.match(/(\{[\s\S]*\})/);
      const jsonText = jsonMatch ? jsonMatch[1] : resultText;
      classificationResult = JSON.parse(jsonText);
    } catch (parseError) {
      console.error('Failed to parse AI response:', parseError);
      throw new Error('Invalid response format from classification service');
    }

    // Validate required fields
    if (!classificationResult.classification || !['meter', 'electricity', 'gas'].includes(classificationResult.classification)) {
      throw new Error('Invalid classification type returned');
    }

    console.log('Classification successful:', classificationResult.classification, 'confidence:', classificationResult.confidence);

    return new Response(
      JSON.stringify(classificationResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in onebill-classify-document:', error);
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
