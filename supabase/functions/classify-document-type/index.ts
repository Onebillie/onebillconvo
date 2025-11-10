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
    const { attachmentId, businessId, documentTypeIds, strategy, minConfidence } = await req.json();
    
    console.log("Classifying document:", { attachmentId, businessId, strategy });

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

    // Get configured document types
    let query = supabase
      .from("document_types")
      .select("*")
      .eq("business_id", businessId)
      .eq("is_active", true);

    if (documentTypeIds && documentTypeIds.length > 0) {
      query = query.in("id", documentTypeIds);
    }

    const { data: documentTypes, error: typesError } = await query;
    if (typesError) throw typesError;

    if (!documentTypes || documentTypes.length === 0) {
      return new Response(
        JSON.stringify({ error: "No document types configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const attachmentUrl = attachment.url;

    // Build AI prompt with all document types
    const typesDescription = documentTypes.map(dt => 
      `- ${dt.name}: ${dt.description || 'No description'}\n  Keywords: ${dt.ai_detection_keywords.join(', ')}`
    ).join('\n\n');

    const systemPrompt = `You are a document classification AI. Classify documents into one of the predefined types based on their content and keywords. Return only JSON with the document type name and confidence score.`;

    const userPrompt = `Classify this document into one of the following types:\n\n${typesDescription}\n\nDocument URL: ${attachmentUrl}\n\nReturn JSON: {"document_type": "Type Name", "confidence": 0.95}`;

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
        model: "google/gemini-2.5-flash",
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

    // Parse AI response
    let classification;
    try {
      const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/```\n([\s\S]*?)\n```/);
      const jsonStr = jsonMatch ? jsonMatch[1] : content;
      classification = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Invalid JSON response from AI");
    }

    // Find matching document type
    const matchedType = documentTypes.find(dt => dt.name === classification.document_type);
    
    if (!matchedType) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          document_type: null, 
          confidence_score: 0,
          error: "Unknown document type" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const confidenceScore = classification.confidence || 0.8;

    // Check minimum confidence
    if (confidenceScore < (minConfidence || 0.8)) {
      console.warn(`Low confidence: ${confidenceScore}`);
      return new Response(
        JSON.stringify({ 
          success: false, 
          document_type: matchedType.name,
          document_type_id: matchedType.id, 
          confidence_score: confidenceScore,
          error: "Confidence below threshold" 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        document_type: matchedType.name,
        document_type_id: matchedType.id,
        confidence_score: confidenceScore,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error classifying document:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
