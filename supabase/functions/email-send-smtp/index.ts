import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { OperationLogger, ERROR_CODES } from "../_shared/emailLogger.ts";
import { logMessageEvent, updateMessageStatus } from '../_shared/messageLogger.ts';

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

    // Initialize logger
    let logger: OperationLogger | null = null;
    if (emailRequest.email_account_id) {
      logger = new OperationLogger(supabaseUrl, supabaseKey, emailRequest.email_account_id, 'send_start');
      await logger.logStep('Send email started', 'started', { 
        to: emailRequest.to,
        conversation_id: emailRequest.conversation_id 
      });
    }

    // Fetch customer data for template population
    const { data: customer } = await supabase
      .from('customers')
      .select('name, first_name, last_name, email, phone')
      .eq('id', emailRequest.customer_id)
      .single();

    // Check for recent unsent messages within the bundling window
    const { data: settings } = await supabase
      .from('business_settings')
      .select('email_html_template, email_bundle_window_minutes, company_name, company_logo, email_signature, email_subject_template')
      .single();

    const bundleWindowMinutes = settings?.email_bundle_window_minutes || 2;
    const bundleWindowMs = bundleWindowMinutes * 60 * 1000;
    const cutoffTime = new Date(Date.now() - bundleWindowMs).toISOString();

    // Get recent messages from this conversation that haven't been emailed yet
    const { data: pendingMessages } = await supabase
      .from('messages')
      .select('id, content, created_at')
      .eq('conversation_id', emailRequest.conversation_id)
      .eq('direction', 'outbound')
      .eq('platform', 'email')
      .eq('status', 'pending')
      .gte('created_at', cutoffTime)
      .order('created_at', { ascending: true });

    // Bundle the current message with any pending messages
    let bundledContent = emailRequest.text || emailRequest.html;
    const messageIds: string[] = [];

    if (pendingMessages && pendingMessages.length > 0) {
      console.log(`Bundling ${pendingMessages.length} pending messages`);
      const allMessages = [...pendingMessages.map(m => m.content), bundledContent];
      bundledContent = allMessages.join('\n\n---\n\n');
      messageIds.push(...pendingMessages.map(m => m.id));
    }

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

    // Check message limit (but don't increment yet - will do after success)
    const { data: business } = await supabase
      .from('businesses')
      .select('subscription_tier, message_count_current_period, is_unlimited')
      .eq('id', account.business_id)
      .single();

    let businessIdForIncrement: string | null = null;

    if (business) {
      // Skip limit check for unlimited accounts
      if (!business.is_unlimited) {
        const limits: Record<string, number> = {
          free: 100,
          starter: 1000,
          professional: 10000,
          enterprise: 999999
        };
        const limit = limits[business.subscription_tier] || 0;
        const currentCount = business.message_count_current_period || 0;

        if (currentCount >= limit) {
          console.error(`Message limit reached for business ${account.business_id}: ${currentCount}/${limit}`);
          return new Response(
            JSON.stringify({ 
              error: 'Message limit reached',
              details: `You've sent ${currentCount}/${limit} messages this period. Upgrade your plan.`
            }),
            { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }

      // Store business_id to increment after successful send
      businessIdForIncrement = account.business_id;
    }

    // Build HTML from template
    let htmlTemplate = settings?.email_html_template || `
<!DOCTYPE html>
<html>
<body>
  <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
    {{content}}
    <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
    <p style="color: #666; font-size: 12px;">{{signature}}</p>
  </div>
</body>
</html>`;

    // Replace template variables
    const contentHtml = bundledContent.replace(/\n/g, '<br>');
    const companyName = settings?.company_name || 'Customer Service';
    const companyLogo = settings?.company_logo || '';
    const signature = settings?.email_signature?.replace(/\n/g, '<br>') || `Best regards,<br>${companyName}`;

    // Populate customer data in content
    let finalContent = contentHtml;
    if (customer) {
      finalContent = finalContent.replace(/\{\{customer_name\}\}/g, customer.name || '');
      finalContent = finalContent.replace(/\{\{name\}\}/g, customer.name || '');
      finalContent = finalContent.replace(/\{\{first_name\}\}/g, customer.first_name || '');
      finalContent = finalContent.replace(/\{\{last_name\}\}/g, customer.last_name || '');
      finalContent = finalContent.replace(/\{\{email\}\}/g, customer.email || '');
      finalContent = finalContent.replace(/\{\{phone\}\}/g, customer.phone || '');
    }

    // Populate subject template
    let finalSubject = emailRequest.subject;
    finalSubject = finalSubject.replace(/\{\{company_name\}\}/g, companyName);
    if (customer) {
      finalSubject = finalSubject.replace(/\{\{customer_name\}\}/g, customer.name || '');
      finalSubject = finalSubject.replace(/\{\{name\}\}/g, customer.name || '');
    }

    // First, fill in company placeholders on the template itself
    const hasContentPlaceholder = /\{\{content\}\}/.test(htmlTemplate);
    const templWithCompany = htmlTemplate
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{signature\}\}/g, signature)
      .replace(/\{\{company_logo\}\}/g, companyLogo);

    // Insert content into the template (with fallback if {{content}} is missing)
    let finalHtml = templWithCompany;
    if (hasContentPlaceholder) {
      finalHtml = finalHtml.replace(/\{\{content\}\}/g, finalContent);
    } else {
      // Try to inject into a common content container, otherwise before </body>, otherwise append
      if (/<div[^>]*class=["'][^"']*email-content[^"']*["'][^>]*>/i.test(finalHtml)) {
        finalHtml = finalHtml.replace(
          /(<div[^>]*class=["'][^"']*email-content[^"']*["'][^>]*>)/i,
          `$1${finalContent}`
        );
      } else if (/<body[^>]*>/i.test(finalHtml)) {
        finalHtml = finalHtml.replace(/<\/body>/i, `<div>${finalContent}</div></body>`);
      } else {
        finalHtml += `<div>${finalContent}</div>`;
      }
      console.log('Template missing {{content}} placeholder - injected content automatically');
    }

    // Finally, apply any customer placeholders present in the template itself
    if (customer) {
      finalHtml = finalHtml
        .replace(/\{\{customer_name\}\}/g, customer.name || '')
        .replace(/\{\{name\}\}/g, customer.name || '')
        .replace(/\{\{first_name\}\}/g, customer.first_name || '')
        .replace(/\{\{last_name\}\}/g, customer.last_name || '')
        .replace(/\{\{email\}\}/g, customer.email || '')
        .replace(/\{\{phone\}\}/g, customer.phone || '');
    }


    // Send email via SMTP
    const emailSent = await sendViaSMTP(
      account,
      emailRequest.to,
      finalSubject,
      finalHtml,
      bundledContent
    );

    if (!emailSent) {
      throw new Error('Failed to send email via SMTP');
    }

    // Increment message count only after successful send
    if (businessIdForIncrement) {
      console.log(`Incrementing message count for business: ${businessIdForIncrement}`);
      await supabase.rpc('increment_message_count', { business_uuid: businessIdForIncrement });
    }

    // Update the most recent pending message to 'sent' (instead of inserting a new one)
    // This prevents duplicate messages from appearing in the chat
    const { data: pendingMessage, error: fetchError } = await supabase
      .from('messages')
      .select('id')
      .eq('conversation_id', emailRequest.conversation_id)
      .eq('customer_id', emailRequest.customer_id)
      .eq('direction', 'outbound')
      .eq('platform', 'email')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching pending message:', fetchError);
    }

    // Update the pending message to sent with bundled content
    if (pendingMessage) {
      const { error: updateError } = await supabase
        .from('messages')
        .update({ 
          content: bundledContent,
          template_content: finalHtml,
          delivery_status: 'sent',
          status: 'sent'
        })
        .eq('id', pendingMessage.id);

      if (updateError) {
        console.error('Failed to update message record:', updateError);
      } else {
        console.log('Updated pending message to sent status');
        
        // Log email sent
        await logMessageEvent(
          supabaseUrl,
          supabaseKey,
          pendingMessage.id,
          'sent',
          'success',
          'email',
          { to: emailRequest.to, subject: finalSubject }
        );
      }
    } else {
      // Fallback: if no pending message found, insert a new one
      // This should rarely happen but prevents message loss
      console.warn('No pending message found, inserting new message record');
      
      const { data: conversation } = await supabase
        .from("conversations")
        .select("business_id")
        .eq("id", emailRequest.conversation_id)
        .single();

      const { data: newMessage, error: insertError } = await supabase
        .from('messages')
        .insert({
          conversation_id: emailRequest.conversation_id,
          customer_id: emailRequest.customer_id,
          content: bundledContent,
          template_content: finalHtml,
          delivery_status: 'sent',
          direction: 'outbound',
          platform: 'email',
          status: 'sent',
          is_read: true,
          business_id: conversation?.business_id
        })
        .select()
        .single();

      if (newMessage) {
        // Log email sent
        await logMessageEvent(
          supabaseUrl,
          supabaseKey,
          newMessage.id,
          'sent',
          'success',
          'email',
          { to: emailRequest.to, subject: finalSubject }
        );
      }

      if (insertError) {
        console.error('Failed to insert message record:', insertError);
      }
    }

    // Mark bundled messages as sent
    if (messageIds.length > 0) {
      await supabase
        .from('messages')
        .update({ status: 'sent' })
        .in('id', messageIds);
      
      console.log(`Marked ${messageIds.length} bundled messages as sent`);
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
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.error(`[${requestId}] Error in email-send-smtp function:`, error);
    
    // Determine if this is a known error type
    const isKnownError = error.message.includes('limit reached') || 
                         error.message.includes('account not found') ||
                         error.message.includes('SMTP');
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: error.stack,
        requestId
      }),
      { 
        status: isKnownError ? 400 : 500, 
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
          username: account.smtp_username?.trim() || account.email_address,
          password: account.smtp_password?.trim(),
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
