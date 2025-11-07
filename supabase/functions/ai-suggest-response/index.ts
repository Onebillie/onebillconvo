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

    // Get business_id from conversation
    const { data: conversation } = await supabaseClient
      .from('conversations')
      .select('business_id')
      .eq('id', conversation_id)
      .single();

    if (!conversation) {
      throw new Error('Conversation not found');
    }

    // Get active AI provider for this business
    const { data: provider } = await supabaseClient
      .from('ai_providers')
      .select('*')
      .eq('business_id', conversation.business_id)
      .eq('is_active', true)
      .single();

    if (!provider) {
      return new Response(
        JSON.stringify({ suggestions: [], error: 'No AI provider configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build full prompt
    const fullMessages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory.slice(-5),
      { role: 'user', content: `Customer message: "${latest_message}"\n\nGenerate 2-3 brief response suggestions, separated by "|||". Each should be max 2 sentences.` }
    ];

    // Call AI provider
    const aiResponse = await callAIProvider(provider, fullMessages);

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

async function callAIProvider(provider: any, messages: any[]): Promise<string> {
  try {
    switch (provider.provider_name) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${provider.api_key}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model_name || 'gpt-4o-mini',
            messages,
            temperature: 0.7,
            max_tokens: 300,
          }),
        });
        
        if (!response.ok) throw new Error('OpenAI request failed');
        const data = await response.json();
        return data.choices[0].message.content;
      }

      case 'anthropic': {
        const systemMsg = messages.find(m => m.role === 'system');
        const userMessages = messages.filter(m => m.role !== 'system');
        
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': provider.api_key,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: provider.model_name || 'claude-3-5-sonnet-20241022',
            max_tokens: 300,
            system: systemMsg?.content || '',
            messages: userMessages.map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content })),
          }),
        });
        
        if (!response.ok) throw new Error('Anthropic request failed');
        const data = await response.json();
        return data.content[0].text;
      }

      case 'google': {
        const model = provider.model_name || 'gemini-2.5-flash';
        const fullPrompt = messages.map(m => `${m.role}: ${m.content}`).join('\n\n');
        
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${provider.api_key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: fullPrompt }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 300 }
          }),
        });
        
        if (!response.ok) throw new Error('Google AI request failed');
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      case 'azure': {
        if (!provider.api_endpoint) throw new Error('Azure endpoint not configured');
        
        const response = await fetch(provider.api_endpoint, {
          method: 'POST',
          headers: {
            'api-key': provider.api_key,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages,
            temperature: 0.7,
            max_tokens: 300,
          }),
        });
        
        if (!response.ok) throw new Error('Azure request failed');
        const data = await response.json();
        return data.choices[0].message.content;
      }

      default:
        throw new Error('Unknown provider: ' + provider.provider_name);
    }
  } catch (error) {
    console.error('AI provider call error:', error);
    throw error;
  }
}
