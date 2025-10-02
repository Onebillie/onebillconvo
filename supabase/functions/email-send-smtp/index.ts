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
  
  try {
    // Import SMTPClient from denomailer
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");
    
    const client = new SMTPClient({
      connection: {
        hostname: account.smtp_host,
        port: account.smtp_port,
        tls: account.smtp_use_ssl,
        auth: {
          username: account.smtp_username,
          password: account.smtp_password,
        },
      },
    });

    await client.send({
      from: account.email_address,
      to: to,
      replyTo: account.email_address,
      subject: subject,
      content: text || html,
      html: html,
    });

    await client.close();
    
    console.log('Email sent successfully via SMTP from:', account.email_address);
    return true;
  } catch (error: any) {
    console.error('SMTP send error:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}
