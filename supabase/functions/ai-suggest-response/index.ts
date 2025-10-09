import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversation_id, latest_message } = await req.json();

    if (!conversation_id || !latest_message) {
      throw new Error("Missing required parameters");
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Check if AI is enabled for this conversation
    const { data: aiSettings } = await supabaseClient
      .from('conversation_ai_settings')
      .select('ai_enabled')
      .eq('conversation_id', conversation_id)
      .maybeSingle();

    if (aiSettings && !aiSettings.ai_enabled) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch AI configuration
    const { data: config } = await supabaseClient
      .from('ai_assistant_config')
      .select('*')
      .single();

    if (!config || !config.is_enabled) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch recent conversation history (last 10 messages)
    const { data: messages } = await supabaseClient
      .from('messages')
      .select('content, direction, created_at')
      .eq('conversation_id', conversation_id)
      .order('created_at', { ascending: false })
      .limit(10);

    // Fetch training data
    const { data: trainingData } = await supabaseClient
      .from('ai_training_data')
      .select('question, answer')
      .eq('is_active', true);

    // Build context for AI
    const conversationHistory = messages?.reverse().map(msg => ({
      role: msg.direction === 'inbound' ? 'user' : 'assistant',
      content: msg.content
    })) || [];

    const knowledgeBase = trainingData?.map(t => 
      `Q: ${t.question}\nA: ${t.answer}`
    ).join('\n\n') || '';

    const systemPrompt = `You are a helpful customer service assistant. Generate 2-3 SHORT, professional response suggestions (max 2 sentences each) for the latest customer message.

Knowledge Base:
${knowledgeBase}

Guidelines:
- Keep responses brief and natural
- Be professional and friendly
- Address the customer's question directly
- Provide actionable information when possible`;

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          ...conversationHistory.slice(-5), // Last 5 messages for context
          { role: 'user', content: `Customer message: "${latest_message}"\n\nGenerate 2-3 brief response suggestions, separated by "|||". Each should be max 2 sentences.` }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    // Parse suggestions
    const suggestionTexts = aiResponse.split('|||')
      .map(s => s.trim())
      .filter(s => s.length > 0 && s.length < 200) // Filter out empty or too long
      .slice(0, 3); // Max 3 suggestions

    const suggestions = suggestionTexts.map(text => ({
      text,
      confidence: 0.85 // Placeholder confidence score
    }));

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in ai-suggest-response:', error);
    return new Response(
      JSON.stringify({ error: error.message, suggestions: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
