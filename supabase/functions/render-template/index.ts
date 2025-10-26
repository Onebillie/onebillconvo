import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { template, mergeData, channel } = await req.json();

    if (!template || !mergeData) {
      return new Response(
        JSON.stringify({ error: 'Template and mergeData are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Select the appropriate content based on channel
    let content = '';
    switch (channel) {
      case 'email':
        content = template.content_email || '';
        break;
      case 'whatsapp':
        content = template.content_whatsapp || '';
        break;
      case 'sms':
        content = template.content_sms || '';
        break;
      default:
        content = template.content_email || '';
    }

    // Replace merge tags with actual data
    let renderedContent = content;
    
    // Common merge tags
    const mergeTags: Record<string, any> = {
      '{{customer_name}}': mergeData.customer_name || mergeData.name || '',
      '{{first_name}}': mergeData.first_name || (mergeData.name ? mergeData.name.split(' ')[0] : ''),
      '{{email}}': mergeData.email || '',
      '{{phone}}': mergeData.phone || '',
      '{{company_name}}': mergeData.company_name || 'Our Company',
      ...mergeData, // Include all custom merge data
    };

    // Replace all merge tags
    for (const [tag, value] of Object.entries(mergeTags)) {
      const tagPattern = new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g');
      renderedContent = renderedContent.replace(tagPattern, String(value || ''));
    }

    // For email, inline CSS for better email client compatibility
    if (channel === 'email') {
      // Basic inline CSS - in production, use a proper CSS inliner
      renderedContent = renderedContent.replace(/<style[^>]*>.*?<\/style>/gs, '');
    }

    // For SMS/WhatsApp, strip HTML tags
    if (channel === 'sms' || channel === 'whatsapp') {
      renderedContent = renderedContent.replace(/<[^>]*>/g, '');
    }

    return new Response(
      JSON.stringify({
        rendered: renderedContent,
        subject: template.email_subject ? replaceTemplateTags(template.email_subject, mergeTags) : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in render-template:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

function replaceTemplateTags(text: string, mergeTags: Record<string, any>): string {
  let result = text;
  for (const [tag, value] of Object.entries(mergeTags)) {
    const tagPattern = new RegExp(tag.replace(/[{}]/g, '\\$&'), 'g');
    result = result.replace(tagPattern, String(value || ''));
  }
  return result;
}
