import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { Resend } from "npm:resend@2.0.0";
import { logEmailOperation, ERROR_CODES } from "../_shared/emailLogger.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailRequest {
  customer_id: string;
  content: string;
  conversation_id?: string;
  email_account_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const resendApiKey = Deno.env.get('RESEND_API_KEY');

  if (!resendApiKey) {
    return new Response(
      JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);
  const resend = new Resend(resendApiKey);

  try {
    const { customer_id, content, conversation_id, email_account_id }: EmailRequest = await req.json();

    // Fetch customer data
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('email, name, business_id')
      .eq('id', customer_id)
      .single();

    if (customerError || !customer?.email) {
      throw new Error('Customer email not found');
    }

    // Fetch business settings
    const { data: settings } = await supabase
      .from('business_settings')
      .select('*')
      .single();

    const companyName = settings?.company_name || 'Our Company';
    const fromEmail = settings?.from_email || 'onboarding@resend.dev';
    const replyToEmail = settings?.reply_to_email || settings?.support_email;
    const signature = settings?.email_signature || '';

    // Check for recent messages to bundle (within 2 minutes)
    const bundleWindow = settings?.email_bundle_window_minutes || 2;
    const bundleTimeThreshold = new Date(Date.now() - bundleWindow * 60 * 1000).toISOString();

    const { data: recentMessages } = await supabase
      .from('messages')
      .select('id, content, created_at')
      .eq('customer_id', customer_id)
      .eq('channel', 'email')
      .eq('status', 'pending')
      .gte('created_at', bundleTimeThreshold)
      .order('created_at', { ascending: true });

    const messagesToSend = recentMessages || [];
    const bundledContent = messagesToSend.length > 1
      ? messagesToSend.map(m => `<p>${m.content}</p>`).join('<hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">')
      : content;

    // Apply email template
    let emailHtml = settings?.email_html_template || '{{content}}';
    emailHtml = emailHtml
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{content\}\}/g, bundledContent)
      .replace(/\{\{signature\}\}/g, signature || '');

    const subject = (settings?.email_subject_template || 'Message from {{company_name}}')
      .replace(/\{\{company_name\}\}/g, companyName);

    console.log(`Sending email to ${customer.email} via Resend`);

    // Send via Resend
    const { data: emailData, error: sendError } = await resend.emails.send({
      from: fromEmail,
      to: [customer.email],
      subject,
      html: emailHtml,
      reply_to: replyToEmail,
    });

    if (sendError) {
      console.error('Resend send error:', sendError);
      
      if (email_account_id) {
        await logEmailOperation(supabase, {
          accountId: email_account_id,
          operationType: 'resend_send',
          stepName: 'Send email',
          status: 'error',
          errorCode: ERROR_CODES.SEND_FAILED,
          errorMessage: sendError.message,
        });
      }

      throw new Error(`Failed to send email: ${sendError.message}`);
    }

    console.log('Email sent successfully via Resend:', emailData?.id);

    // Insert message record
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        conversation_id,
        customer_id,
        business_id: customer.business_id,
        content: bundledContent.replace(/<[^>]*>/g, ''),
        direction: 'outbound',
        status: 'sent',
        channel: 'email',
        platform: 'email',
        external_message_id: emailData?.id,
      });

    if (insertError) {
      console.error('Failed to insert message:', insertError);
    }

    // Mark bundled messages as sent
    if (messagesToSend.length > 0) {
      const messageIds = messagesToSend.map(m => m.id);
      await supabase
        .from('messages')
        .update({ status: 'sent' })
        .in('id', messageIds);
    }

    // Update customer last_contact_method
    await supabase
      .from('customers')
      .update({ last_contact_method: 'email' })
      .eq('id', customer_id);

    if (email_account_id) {
      await logEmailOperation(supabase, {
        accountId: email_account_id,
        operationType: 'resend_send',
        stepName: 'Email sent successfully',
        status: 'success',
        details: { resend_id: emailData?.id, bundled_count: messagesToSend.length },
      });
    }

    return new Response(
      JSON.stringify({ success: true, message_id: emailData?.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error in email-send-resend:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
