import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-session-token',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get session token
    const sessionToken = req.headers.get('x-session-token');
    if (!sessionToken) {
      return new Response(
        JSON.stringify({ error: 'Missing session token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify session
    const { data: session, error: sessionError } = await supabase
      .from('embed_sessions')
      .select(`
        *,
        embed_sites!inner(business_id)
      `)
      .eq('session_token', sessionToken)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const businessId = session.embed_sites.business_id;

    // Get AI settings
    const { data: aiSettings } = await supabase
      .from('embed_ai_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

    if (!aiSettings?.ai_triage_enabled) {
      return new Response(
        JSON.stringify({ error: 'AI triage not enabled' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { message } = await req.json();
    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build system prompt
    const departments = aiSettings.departments as Array<{id: string, name: string, description: string, keywords: string[]}> || [];
    const departmentInfo = departments.map(d => 
      `- ${d.name}: ${d.description} (Keywords: ${d.keywords.join(', ')})`
    ).join('\n');

    const systemPrompt = aiSettings.system_prompt || `You are an intelligent customer service assistant that helps triage incoming customer inquiries.

Your tasks:
1. Analyze the customer's message to understand their intent
2. Determine which department is best suited to handle this inquiry
3. Generate a helpful, professional first response that:
   - Acknowledges their message
   - Shows understanding of their needs
   - Sets appropriate expectations
   - Is warm and friendly

Available Departments:
${departmentInfo}

Respond with a JSON object containing:
{
  "department": "department_id or general",
  "intent": "sales|support|technical|billing|general",
  "confidence": 0.0-1.0,
  "first_response": "Your generated response"
}`;

    // Call Lovable AI
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
          { role: 'user', content: `Customer message: "${message}"` }
        ],
        temperature: 0.7,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      
      // Fallback to default welcome message instead of failing
      const { data: customization } = await supabase
        .from('embed_customizations')
        .select('greeting_message')
        .eq('business_id', businessId)
        .single();
      
      const fallbackResponse = {
        department: 'general',
        intent: 'general',
        confidence: 0.3,
        first_response: customization?.greeting_message || 'Thank you for contacting us! A team member will be with you shortly.',
      };
      
      // Send fallback message if enabled
      if (aiSettings.ai_first_response_enabled) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: session.conversation_id,
            content: fallbackResponse.first_response,
            direction: 'outbound',
            platform: 'embed',
            status: 'delivered',
            metadata: { system_message: true, ai_fallback: true },
          });
      }
      
      return new Response(
        JSON.stringify({
          success: true,
          triage: fallbackResponse,
          fallback: true
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const aiContent = aiData.choices[0].message.content;

    // Parse AI response
    let triageResult;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = aiContent.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/) || 
                       aiContent.match(/(\{[\s\S]*?\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : aiContent;
      triageResult = JSON.parse(jsonStr);
    } catch (e) {
      console.error('Failed to parse AI response:', e, aiContent);
      
      // Get customization to use configured greeting as fallback
      const { data: customization } = await supabase
        .from('embed_customizations')
        .select('greeting_message')
        .eq('business_id', businessId)
        .single();
      
      triageResult = {
        department: 'general',
        intent: 'general',
        confidence: 0.5,
        first_response: customization?.greeting_message || 'Thank you for your message! A member of our team will be with you shortly.',
      };
    }

    // Send AI response as first message if enabled
    if (aiSettings.ai_first_response_enabled && triageResult.first_response) {
      const { error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: session.conversation_id,
          content: triageResult.first_response,
          direction: 'outbound',
          platform: 'embed',
          status: 'delivered',
          metadata: {
            ai_generated: true,
            triage_result: triageResult,
          },
        });
      
      if (insertError) {
        console.error('Failed to insert AI first response:', insertError);
        // Continue anyway - don't fail the request
      }
    }

    // Update conversation with department info
    if (triageResult.department && triageResult.department !== 'general') {
      await supabase
        .from('conversations')
        .update({
          metadata: {
            ai_department: triageResult.department,
            ai_intent: triageResult.intent,
            ai_confidence: triageResult.confidence,
          }
        })
        .eq('id', session.conversation_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        triage: triageResult,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

console.log('embed-ai-triage function started');