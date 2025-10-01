import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { conversationId, message } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get AI config
    const { data: config } = await supabase
      .from('ai_assistant_config')
      .select('*')
      .single();

    if (!config?.is_enabled) {
      return new Response(JSON.stringify({ enabled: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check conversation-level settings
    const { data: convSettings } = await supabase
      .from('conversation_ai_settings')
      .select('*')
      .eq('conversation_id', conversationId)
      .single();

    if (convSettings && !convSettings.ai_enabled) {
      return new Response(JSON.stringify({ enabled: false }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check business hours
    if (config.out_of_hours_only) {
      const now = new Date();
      const hours = now.getHours();
      const startHour = parseInt(config.business_hours_start.split(':')[0]);
      const endHour = parseInt(config.business_hours_end.split(':')[0]);
      
      if (hours >= startHour && hours < endHour) {
        return new Response(JSON.stringify({ enabled: false, reason: 'business_hours' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get training data and RAG documents
    const [{ data: trainingData }, { data: ragDocs }] = await Promise.all([
      supabase.from('ai_training_data').select('*').eq('is_active', true),
      supabase.from('ai_rag_documents').select('*').eq('is_active', true),
    ]);

    // Build context
    let context = config.system_prompt + '\n\n';
    if (ragDocs && ragDocs.length > 0) {
      context += 'Knowledge Base:\n' + ragDocs.map(doc => `${doc.title}:\n${doc.content}`).join('\n\n');
    }
    if (trainingData && trainingData.length > 0) {
      context += '\n\nFAQs:\n' + trainingData.map(td => `Q: ${td.question}\nA: ${td.answer}`).join('\n\n');
    }

    // Call Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: config.model || 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: context },
          { role: 'user', content: message }
        ],
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 500,
      }),
    });

    if (!response.ok) {
      throw new Error('AI request failed');
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse, enabled: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('AI assistant error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
