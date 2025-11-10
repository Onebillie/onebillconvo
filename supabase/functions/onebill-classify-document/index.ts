import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { encode as encodeBase64 } from "https://deno.land/std@0.168.0/encoding/base64.ts";
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
    
    // Check file size (Lovable AI has ~20MB limit for images)
    const contentLength = fileResponse.headers.get('content-length');
    const fileSizeBytes = contentLength ? parseInt(contentLength) : fileBuffer.byteLength;
    
    if (fileSizeBytes > 20 * 1024 * 1024) {
      console.error(`File too large: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
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
    
    console.log(`Processing file: ${fileName}, size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);
    
    // Determine mime type and whether it's a PDF
    const mimeType = fileResponse.headers.get('content-type') || 
      (fileName.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    const isPdf = mimeType === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf');

    console.log(`[AI-PARSE] MIME type: ${mimeType}, File: ${fileName}, Size: ${(fileSizeBytes / 1024 / 1024).toFixed(2)}MB`);

    let pdfText = '';
    let base64File = '';

    if (isPdf) {
      try {
        // Extract text from PDF (first 3 pages) using pdfjs in Deno
        const pdfModule = await import('https://esm.sh/pdfjs-dist@4.5.136/legacy/build/pdf.mjs');
        // Some environments require explicit workerSrc; legacy build works without a worker in Node-like runtimes
        const loadingTask = pdfModule.getDocument({ data: new Uint8Array(fileBuffer) });
        const pdf = await loadingTask.promise;
        const maxPages = Math.min(pdf.numPages, 3);
        for (let p = 1; p <= maxPages; p++) {
          const page = await pdf.getPage(p);
          const content = await page.getTextContent();
          const pageText = (content.items || []).map((it: any) => (it.str || '')).join(' ');
          pdfText += pageText + '\n';
        }
        pdfText = pdfText.replace(/\s+/g, ' ').trim().slice(0, 15000);
        console.log(`[AI-PARSE] Extracted PDF text length: ${pdfText.length}`);
      } catch (e) {
        console.error('[AI-PARSE] PDF text extraction failed:', e);
        return new Response(
          JSON.stringify({ 
            error: 'Failed to read PDF. Please upload a clear image (JPG/PNG/WebP) instead.',
            classification: 'unknown',
            confidence: 0,
            fields: {},
            field_confidence: {},
            low_confidence_fields: []
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    } else {
      // Use native Deno base64 encoding for images
      base64File = encodeBase64(new Uint8Array(fileBuffer));
    }

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
- **supplier_name**: Electricity or gas supplier name (e.g., "Electric Ireland", "SSE Airtricity", "Bord Gáis Energy", "Energia", "Flogas")
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

    // Build messages based on input type
    const messages = isPdf
      ? [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text:
                  'Analyze the following text extracted from a utility document and provide classification and field extraction in the required JSON format.\n\n' +
                  pdfText,
              },
            ],
          },
        ]
      : [
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
        ];

    // Call Lovable AI Gateway (Gemini)
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 1000,
        temperature: 0.3,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error(`[AI-PARSE] Lovable AI error (${aiResponse.status}):`, errorText);
      
      // Handle rate limiting specifically
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'AI service rate limit reached. Please try again in a moment.',
            classification: 'unknown',
            confidence: 0,
            fields: {}
          }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
