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
    const { conversationId, message, customerId } = await req.json();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get conversation and business info
    const { data: conversation } = await supabase
      .from('conversations')
      .select('business_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) throw new Error('Conversation not found');
    const businessId = conversation.business_id;

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

    // Get privacy settings
    const { data: privacySettings } = await supabase
      .from('ai_privacy_settings')
      .select('*')
      .eq('business_id', businessId)
      .single();

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

    // Get per-customer context
    const { data: customerContext } = await supabase
      .from('ai_customer_context')
      .select('*')
      .eq('business_id', businessId)
      .eq('customer_id', customerId)
      .single();

    // Get conversation history (last 10 messages)
    const { data: messageHistory } = await supabase
      .from('messages')
      .select('content, direction')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(10);

    // Simple keyword-based RAG (search document chunks)
    const keywords = extractKeywords(message);
    const { data: relevantChunks } = await supabase
      .from('ai_document_chunks')
      .select('chunk_text, document_id, ai_knowledge_documents!inner(title)')
      .eq('business_id', businessId)
      .textSearch('chunk_text', keywords.join(' | '), { type: 'websearch' })
      .limit(5);

    // Get training data
    const { data: trainingData } = await supabase
      .from('ai_training_data')
      .select('*')
      .eq('is_active', true);

    // Build context with privacy controls
    let context = config.system_prompt + '\n\n';
    
    // Add knowledge base (if available)
    if (relevantChunks && relevantChunks.length > 0) {
      context += 'Relevant information from knowledge base:\n';
      const sources: string[] = [];
      relevantChunks.forEach(chunk => {
        context += `\n${chunk.chunk_text}\n`;
        sources.push(chunk.ai_knowledge_documents.title);
      });
      context += '\n[Sources: ' + [...new Set(sources)].join(', ') + ']\n\n';
    }

    // Add FAQs
    if (trainingData && trainingData.length > 0) {
      context += 'FAQs:\n' + trainingData.map(td => `Q: ${td.question}\nA: ${td.answer}`).join('\n\n') + '\n\n';
    }

    // Add customer context (only for this customer)
    if (customerContext?.context_summary) {
      context += `Previous context with this customer:\n${customerContext.context_summary}\n\n`;
    }

    // Add conversation history
    if (messageHistory && messageHistory.length > 0) {
      context += 'Recent conversation:\n';
      messageHistory.reverse().forEach(msg => {
        const role = msg.direction === 'inbound' ? 'Customer' : 'Agent';
        context += `${role}: ${msg.content}\n`;
      });
    }

    // Closed dataset mode enforcement
    if (privacySettings?.closed_dataset_mode && (!relevantChunks || relevantChunks.length === 0)) {
      return new Response(JSON.stringify({ 
        response: "I apologize, but I can only answer questions based on our documented information. I don't have specific information about this in our knowledge base. Would you like to speak with a human agent?",
        enabled: true,
        confidence: 0,
        closed_dataset_blocked: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    context += '\nIMPORTANT: Be accurate, helpful, and stay within the scope of the provided information. If unsure, admit it and offer to connect to a human agent.\n';

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

    // Calculate confidence (simplified)
    const confidence = relevantChunks && relevantChunks.length > 0 ? 0.85 : 0.60;

    // Check confidence threshold
    if (privacySettings?.require_high_confidence && confidence < (privacySettings.confidence_threshold || 0.75)) {
      return new Response(JSON.stringify({ 
        response: "I'm not confident enough to answer this accurately. Let me connect you with a team member who can help better.",
        enabled: true,
        confidence,
        escalated: true
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Log response (with optional PII masking)
    let loggedPrompt = message;
    let loggedResponse = aiResponse;
    
    if (privacySettings?.mask_pii) {
      loggedPrompt = maskPII(message);
      loggedResponse = maskPII(aiResponse);
    }

    await supabase.from('ai_response_logs').insert({
      business_id: businessId,
      conversation_id: conversationId,
      customer_id: customerId,
      prompt: loggedPrompt,
      response: loggedResponse,
      confidence_score: confidence,
      sources_used: relevantChunks?.map(c => c.ai_knowledge_documents.title) || []
    });

    // Update customer context
    await supabase.from('ai_customer_context').upsert({
      business_id: businessId,
      customer_id: customerId,
      conversation_id: conversationId,
      context_summary: `Last query: ${message.substring(0, 100)}...`,
      last_interaction: new Date().toISOString()
    }, {
      onConflict: 'business_id,customer_id'
    });

    return new Response(JSON.stringify({ 
      response: aiResponse, 
      enabled: true,
      confidence,
      sources: relevantChunks?.map(c => c.ai_knowledge_documents.title) || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('AI assistant error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function extractKeywords(text: string): string[] {
  // Simple keyword extraction (remove common words)
  const stopWords = new Set(['the', 'is', 'at', 'which', 'on', 'a', 'an', 'and', 'or', 'but', 'in', 'with', 'to', 'for', 'of', 'as', 'by']);
  return text.toLowerCase()
    .split(/\W+/)
    .filter(word => word.length > 3 && !stopWords.has(word))
    .slice(0, 10);
}

function maskPII(text: string): string {
  // Mask emails
  text = text.replace(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, '[EMAIL]');
  
  // Mask phone numbers
  text = text.replace(/\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, '[PHONE]');
  text = text.replace(/\b\+\d{1,3}\s?\d{6,}\b/g, '[PHONE]');
  
  // Mask credit cards
  text = text.replace(/\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, '[CARD]');
  
  return text;
}
