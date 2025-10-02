import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { to, subject, content, conversationId, customerId }: EmailRequest = await req.json();

    console.log("=== SEND EMAIL FUNCTION CALLED ===");
    console.log("Sending email to:", to);
    console.log("Subject:", subject);
    console.log("Content length:", content?.length);
    console.log("Conversation ID:", conversationId);
    console.log("Customer ID:", customerId);

    // Get business settings for email configuration
    const { data: settings } = await supabase
      .from("business_settings")
      .select("company_name, support_email, from_email, reply_to_email, email_subject_template, email_signature")
      .single();

    const fromEmail = settings?.from_email || settings?.support_email || "onboarding@resend.dev";
    const replyToEmail = settings?.reply_to_email || settings?.support_email;
    const companyName = settings?.company_name || "Customer Service";
    
    // Parse subject template
    let emailSubject = subject || settings?.email_subject_template || "Message from {{company_name}}";
    emailSubject = emailSubject.replace(/\{\{company_name\}\}/g, companyName);

    const signature = settings?.email_signature 
      ? settings.email_signature.replace(/\n/g, '<br>')
      : `Best regards,<br>${companyName}`;

    const emailConfig: any = {
      from: `${companyName} <${fromEmail}>`,
      to: [to],
      subject: emailSubject,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <p>${content.replace(/\n/g, '<br>')}</p>
          <br>
          <p style="color: #666; font-size: 14px;">
            ${signature}
          </p>
        </div>
      `,
    };

    // Add reply-to if configured
    if (replyToEmail) {
      emailConfig.reply_to = replyToEmail;
    }

    console.log("Attempting to send via Resend...");
    const emailResponse = await resend.emails.send(emailConfig);

    console.log("✅ Email sent successfully:", emailResponse);

    // Create message record in database with Resend message ID for tracking
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
        external_message_id: emailResponse.data?.id || emailResponse.id,
      });

    if (messageError) {
      console.error("Error saving message:", messageError);
    }

    // Update customer's last contact method
    await supabase
      .from("customers")
      .update({ last_contact_method: "email" })
      .eq("id", customerId);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
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

serve(handler);
