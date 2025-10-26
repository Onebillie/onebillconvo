import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, channel, business_context } = await req.json();

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: 'Prompt is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build system prompt based on channel
    let systemPrompt = `You are an expert marketing copywriter. Generate professional, engaging content that converts.`;
    
    if (channel === 'email') {
      systemPrompt += ` Create compelling email content with a clear subject line and body. Use persuasive language and include a strong call-to-action.`;
    } else if (channel === 'sms') {
      systemPrompt += ` Create concise SMS content (max 160 characters). Be direct, urgent, and include a clear call-to-action.`;
    } else if (channel === 'whatsapp') {
      systemPrompt += ` Create friendly WhatsApp message content. Be conversational, personable, and include emojis where appropriate.`;
    }

    if (business_context) {
      systemPrompt += ` Business context: ${business_context}`;
    }

    systemPrompt += ` Include merge tags like {{first_name}}, {{company}}, {{email}} where personalization would be effective.`;

    // Call Lovable AI Gateway
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
          { role: 'user', content: prompt }
        ],
        max_completion_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits depleted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const generatedContent = data.choices?.[0]?.message?.content;

    if (!generatedContent) {
      throw new Error('No content generated');
    }

    // For email, try to parse subject and body
    let result: any = { content: generatedContent };
    
    if (channel === 'email') {
      const lines = generatedContent.split('\n');
      const subjectLine = lines.find(line => line.toLowerCase().startsWith('subject:'));
      
      if (subjectLine) {
        result.subject = subjectLine.replace(/^subject:\s*/i, '').trim();
        result.body = lines.slice(lines.indexOf(subjectLine) + 1).join('\n').trim();
      } else {
        result.subject = 'Your Personalized Offer';
        result.body = generatedContent;
      }
    }

    console.log('Content generated successfully for channel:', channel);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('Error in generate-marketing-content:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate content' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
