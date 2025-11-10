import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { attachmentId, businessId, extractionSchema, provider, model, enablePIIMasking, confidenceThreshold } = await req.json();
    
    console.log("Parsing document:", { attachmentId, businessId, provider, model });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get attachment details
    const { data: attachment, error: attachmentError } = await supabase
      .from("message_attachments")
      .select("*")
      .eq("id", attachmentId)
      .single();

    if (attachmentError) throw attachmentError;

    // Download attachment content (for now, just use URL - in production, fetch and OCR)
    const attachmentUrl = attachment.url;

    // Build AI prompt with extraction schema
    const schemaDescription = Object.entries(extractionSchema).map(([field, config]: [string, any]) => 
      `- ${field} (${config.type}): ${config.description || 'No description'}${config.required ? ' [REQUIRED]' : ''}`
    ).join('\n');

    const systemPrompt = `You are a document parsing AI. Extract structured data from documents according to the schema provided. Return only valid JSON matching the schema exactly.${enablePIIMasking ? ' IMPORTANT: Mask any PII (names, emails, phone numbers, addresses) with asterisks unless explicitly marked as non-PII in the schema.' : ''}`;

    const userPrompt = `Extract data from this document according to the following schema:\n\n${schemaDescription}\n\nDocument URL: ${attachmentUrl}\n\nReturn a JSON object with these fields and a confidence score (0-1).`;

    // Call Lovable AI Gateway
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: model || "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        stream: false,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Gateway error:", aiResponse.status, errorText);
      throw new Error(`AI Gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content returned from AI");
    }

    // Parse AI response (expecting JSON)
    let parsedData;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      parsedData = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    const confidenceScore = parsedData.confidence || 0.8;
    delete parsedData.confidence; // Remove from data object

    // Check confidence threshold
    if (confidenceScore < (confidenceThreshold || 0.8)) {
      console.warn(`Low confidence: ${confidenceScore}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        parsed_data: parsedData,
        confidence_score: confidenceScore,
        pii_masked: enablePIIMasking || false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error parsing document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
