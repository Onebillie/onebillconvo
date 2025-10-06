import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  to: string;
  subject?: string;
  content: string;
  conversationId: string;
  customerId: string;
  email_account_id?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, content, conversationId, customerId, email_account_id }: EmailRequest = await req.json();

    console.log("=== SEND EMAIL FUNCTION CALLED (SMTP) ===");
    console.log("Sending email to:", to);
    console.log("Subject:", subject);
    console.log("Content length:", content?.length);
    console.log("Conversation ID:", conversationId);
    console.log("Customer ID:", customerId);

    // Fetch customer data for template population
    const { data: customer } = await supabase
      .from('customers')
      .select('name, first_name, last_name, email, phone')
      .eq('id', customerId)
      .single();

    // Get business settings for email configuration
    const { data: settings } = await supabase
      .from("business_settings")
      .select("company_name, support_email, from_email, reply_to_email, email_subject_template, email_signature, email_html_template")
      .single();

    const companyName = settings?.company_name || "Customer Service";
    
    // Parse subject template
    let emailSubject = subject || settings?.email_subject_template || "Message from {{company_name}}";
    emailSubject = emailSubject.replace(/\{\{company_name\}\}/g, companyName);
    if (customer?.name) {
      emailSubject = emailSubject.replace(/\{\{customer_name\}\}/g, customer.name);
      emailSubject = emailSubject.replace(/\{\{name\}\}/g, customer.name);
    }

    const signature = settings?.email_signature 
      ? settings.email_signature.replace(/\n/g, '<br>')
      : `Best regards,<br>${companyName}`;

    // Build HTML content
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

    let contentHtml = content.replace(/\n/g, '<br>');
    
    // Populate customer data in content
    if (customer) {
      contentHtml = contentHtml.replace(/\{\{customer_name\}\}/g, customer.name || '');
      contentHtml = contentHtml.replace(/\{\{name\}\}/g, customer.name || '');
      contentHtml = contentHtml.replace(/\{\{first_name\}\}/g, customer.first_name || '');
      contentHtml = contentHtml.replace(/\{\{last_name\}\}/g, customer.last_name || '');
      contentHtml = contentHtml.replace(/\{\{email\}\}/g, customer.email || '');
      contentHtml = contentHtml.replace(/\{\{phone\}\}/g, customer.phone || '');
    }
    
    const finalHtml = htmlTemplate
      .replace(/\{\{content\}\}/g, contentHtml)
      .replace(/\{\{company_name\}\}/g, companyName)
      .replace(/\{\{signature\}\}/g, signature);

    // Get email account to use
    let emailAccountId = email_account_id;
    
    if (!emailAccountId) {
      // Use the first active email account
      const { data: accounts } = await supabase
        .from('email_accounts')
        .select('id')
        .eq('is_active', true)
        .limit(1);
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No active email accounts found. Please configure an email account in settings.');
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

    console.log(`Using email account: ${account.email_address}`);

    // Send email via SMTP
    const emailSent = await sendViaSMTP(
      account,
      to,
      emailSubject,
      finalHtml,
      content
    );

    if (!emailSent) {
      throw new Error('Failed to send email via SMTP');
    }

    console.log("✅ Email sent successfully via SMTP");

    // Get business_id from conversation
    const { data: conversation } = await supabase
      .from("conversations")
      .select("business_id")
      .eq("id", conversationId)
      .single();

    // Create message record in database
    const { error: messageError } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        customer_id: customerId,
        content: content,
        direction: "outbound",
        channel: "email",
        platform: "email",
        status: "sent",
        is_read: true,
        business_id: conversation?.business_id
      });

    if (messageError) {
      console.error("Error saving message:", messageError);
    }

    // Update customer's last contact method
    await supabase
      .from("customers")
      .update({ last_contact_method: "email" })
      .eq("id", customerId);

    return new Response(JSON.stringify({ success: true, message: 'Email sent via SMTP' }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

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
          username: account.smtp_username.trim(),
          password: account.smtp_password.trim(),
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

serve(handler);
