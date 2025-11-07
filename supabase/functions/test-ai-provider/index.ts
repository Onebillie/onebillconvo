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
    const { provider_name, api_key, model_name, api_endpoint } = await req.json();

    if (!provider_name || !api_key) {
      throw new Error('Missing required parameters');
    }

    // Test the provider connection
    const testResult = await testProviderConnection(provider_name, api_key, model_name, api_endpoint);

    return new Response(
      JSON.stringify(testResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Test provider error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function testProviderConnection(
  providerName: string,
  apiKey: string,
  modelName: string | null,
  apiEndpoint: string | null
): Promise<{ success: boolean; error?: string; model?: string }> {
  const testMessage = "Hello, please respond with 'OK' if you can read this.";

  try {
    switch (providerName) {
      case 'openai': {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName || 'gpt-4o-mini',
            messages: [{ role: 'user', content: testMessage }],
            max_tokens: 20,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `OpenAI API error: ${error}` };
        }

        const data = await response.json();
        return { success: true, model: data.model };
      }

      case 'anthropic': {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName || 'claude-3-5-sonnet-20241022',
            max_tokens: 20,
            messages: [{ role: 'user', content: testMessage }],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Anthropic API error: ${error}` };
        }

        const data = await response.json();
        return { success: true, model: data.model };
      }

      case 'google': {
        const model = modelName || 'gemini-2.5-flash';
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: testMessage }] }],
            generationConfig: { maxOutputTokens: 20 }
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Google AI error: ${error}` };
        }

        return { success: true, model };
      }

      case 'azure': {
        if (!apiEndpoint) {
          return { success: false, error: 'Azure endpoint is required' };
        }

        const response = await fetch(apiEndpoint, {
          method: 'POST',
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messages: [{ role: 'user', content: testMessage }],
            max_tokens: 20,
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          return { success: false, error: `Azure API error: ${error}` };
        }

        return { success: true, model: 'azure-custom' };
      }

      default:
        return { success: false, error: 'Unknown provider' };
    }
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
