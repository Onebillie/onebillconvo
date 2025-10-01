import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  text?: string;
  conversation_id: string;
  customer_id: string;
  email_account_id?: string; // Optional: specify which email account to use
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const emailRequest: EmailRequest = await req.json();

    console.log('Sending email via SMTP to:', emailRequest.to);

    // Get email account to use
    let emailAccountId = emailRequest.email_account_id;
    
    if (!emailAccountId) {
      // Use the first active email account
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No active email accounts found');
      }
      
      emailAccountId = accounts[0].id;
    }

    // Fetch email account configuration
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', emailAccountId)
      .single();

    if (accountError || !account) {
      throw new Error(`Email account not found: ${accountError?.message}`);
    }

    // Send email via SMTP
    const emailSent = await sendViaSMTP(
      account,
      emailRequest.to,
      emailRequest.subject,
      emailRequest.html,
      emailRequest.text
    );

    if (!emailSent) {
      throw new Error('Failed to send email via SMTP');
    }

    // Insert message record
    const { error: messageError } = await supabase
      .from('messages')
      .insert({
        conversation_id: emailRequest.conversation_id,
        customer_id: emailRequest.customer_id,
        content: emailRequest.text || emailRequest.html,
        direction: 'outbound',
        platform: 'email',
        channel: 'email',
        status: 'sent',
        is_read: true
      });

    if (messageError) {
      console.error('Failed to insert message record:', messageError);
    }

    // Update customer last_contact_method
    await supabase
      .from('customers')
      .update({ last_contact_method: 'email' })
      .eq('id', emailRequest.customer_id);

    console.log('Email sent successfully via SMTP');

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent via SMTP' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in email-send-smtp function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function sendViaSMTP(
  account: any,
  to: string,
  subject: string,
  html: string,
  text?: string
): Promise<boolean> {
  console.log(`Connecting to SMTP: ${account.smtp_host}:${account.smtp_port}`);
  
  // Note: Deno doesn't have native SMTP support
  // You'll need to use a service or library
  
  // TODO: Implement actual SMTP sending using:
  // - nodemailer equivalent for Deno
  // - Or use a service like Mailgun, SendGrid with your domain
  // - Or use a Deno SMTP library
  
  // For now, log the email details
  console.log('Email details:', {
    from: account.email_address,
    to,
    subject,
    html: html.substring(0, 100) + '...'
  });
  
  // Return false to indicate SMTP not yet implemented
  // In production, this would actually send the email and return true/false
  return false;
}
