import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get user from auth token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid user token');
    }

    const { toEmail, subject, htmlContent, textContent, senderAccountId } = await req.json();

    if (!toEmail || !subject || !htmlContent) {
      throw new Error('Missing required fields: toEmail, subject, or htmlContent');
    }

    // Get sender email account details
    let fromEmail = 'onboarding@resend.dev';
    let fromName = 'Test Email';

    if (senderAccountId) {
      const { data: emailAccount } = await supabase
        .from('email_accounts')
        .select('email_address, display_name')
        .eq('id', senderAccountId)
        .single();

      if (emailAccount) {
        fromEmail = emailAccount.email_address;
        fromName = emailAccount.display_name || emailAccount.email_address;
      }
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      throw new Error('RESEND_API_KEY not configured');
    }

    const resend = new Resend(resendApiKey);

    const { data, error } = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [toEmail],
      subject: `[TEST] ${subject}`,
      html: htmlContent,
      text: textContent || htmlContent.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('Resend error:', error);
      throw error;
    }

    console.log('Test email sent successfully:', data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: data?.id,
        message: 'Test email sent successfully'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error sending test email:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Failed to send test email' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});