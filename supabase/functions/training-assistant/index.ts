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
    const { question, currentPage, conversationId, userId, businessId } = await req.json();
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Training assistant query:', { question, currentPage, userId });

    // Search for relevant training content based on question and current page
    const keywords = question.toLowerCase().split(' ').filter(w => w.length > 3);
    
    // Search by keywords, tags, and related pages
    const { data: relevantContent, error: searchError } = await supabase
      .from('training_content')
      .select('*')
      .eq('is_published', true)
      .or(`search_keywords.cs.{${keywords.join(',')}},tags.ov.{${keywords.join(',')}}`)
      .limit(5);

    if (searchError) {
      console.error('Search error:', searchError);
    }

    // Also try to find content relevant to current page
    let pageContent = null;
    if (currentPage) {
      const { data: pageData } = await supabase
        .from('training_content')
        .select('*')
        .contains('related_pages', [currentPage])
        .eq('is_published', true)
        .limit(3);
      
      if (pageData && pageData.length > 0) {
        pageContent = pageData;
      }
    }

    // Get conversation history if exists
    let conversationHistory = [];
    if (conversationId) {
      const { data: conversation } = await supabase
        .from('training_conversations')
        .select('messages')
        .eq('id', conversationId)
        .single();
      
      if (conversation) {
        conversationHistory = conversation.messages || [];
      }
    }

    // Build context from retrieved training content
    let contextText = '';
    if (relevantContent && relevantContent.length > 0) {
      contextText += '\n\nRelevant Training Content:\n';
      relevantContent.forEach((content, idx) => {
        contextText += `\n${idx + 1}. ${content.title}\n`;
        contextText += `Category: ${content.category}\n`;
        contextText += `Description: ${content.description}\n`;
        
        // Include steps if available
        if (content.content && content.content.steps) {
          contextText += 'Steps:\n';
          content.content.steps.forEach((step: any) => {
            contextText += `  ${step.step_number}. ${step.title}: ${step.description}\n`;
          });
        }
        
        // Include troubleshooting if available
        if (content.content && content.content.troubleshooting) {
          contextText += 'Common Issues:\n';
          content.content.troubleshooting.forEach((issue: any) => {
            contextText += `  - ${issue.issue}: ${issue.solution}\n`;
          });
        }
      });
    }

    if (pageContent && pageContent.length > 0) {
      contextText += '\n\nContent for Current Page:\n';
      pageContent.forEach((content) => {
        contextText += `- ${content.title}: ${content.description}\n`;
      });
    }

    // System prompt for training assistant
    const systemPrompt = `You are an expert training assistant for À La Carte Chat platform.
Your role is to help users understand and use every feature of the platform.

Guidelines:
1. Always provide step-by-step instructions
2. Use simple, clear language (avoid jargon)
3. Reference specific UI elements (buttons, tabs, fields)
4. Be encouraging and patient
5. If the user is on a specific page, prioritize help related to that page
6. Suggest related features or next steps when appropriate
7. Format responses with clear structure using markdown
8. Use bullet points and numbered lists for clarity

Current Page: ${currentPage || 'Unknown'}

You have access to comprehensive documentation about:
- Channel setup (WhatsApp, Email, SMS, Instagram, Facebook)
- Marketing campaigns and broadcast messages
- AI Assistant configuration
- Team management and permissions
- API integration
- Automation and workflows
- Customer segmentation
- Analytics and reporting
- Conversations and messaging
- Settings and configuration

${contextText}`;

    // Build messages for AI
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: question }
    ];

    // Call Lovable AI
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('AI API error:', aiResponse.status, errorText);
      throw new Error(`AI API error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const answer = aiData.choices[0].message.content;

    // Save or update conversation
    const newMessage = { role: 'user', content: question };
    const assistantMessage = { role: 'assistant', content: answer };
    
    if (conversationId) {
      // Update existing conversation
      const updatedMessages = [...conversationHistory, newMessage, assistantMessage];
      await supabase
        .from('training_conversations')
        .update({
          messages: updatedMessages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', conversationId);
    } else {
      // Create new conversation
      const { data: newConv } = await supabase
        .from('training_conversations')
        .insert({
          user_id: userId,
          business_id: businessId,
          messages: [newMessage, assistantMessage],
          current_page: currentPage,
        })
        .select()
        .single();
      
      if (newConv) {
        conversationId = newConv.id;
      }
    }

    // Log analytics
    await supabase
      .from('training_analytics')
      .insert({
        question: question,
        page_context: currentPage,
        user_id: userId,
      });

    return new Response(
      JSON.stringify({
        answer,
        conversationId,
        relatedContent: relevantContent?.map(c => ({
          id: c.id,
          title: c.title,
          category: c.category,
        })) || [],
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Training assistant error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
