import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, type, customerPortalUrl } = await req.json();

    if (!email || !type) {
      throw new Error("Email and notification type are required");
    }

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    let subject = "";
    let html = "";

    switch (type) {
      case "payment_failed":
        subject = "Action Required: Payment Failed";
        html = `
          <h1>Payment Failed</h1>
          <p>We were unable to process your recent payment for your subscription.</p>
          <p>To avoid service interruption, please update your payment method as soon as possible.</p>
          <p><a href="${customerPortalUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a></p>
          <p>If you have any questions, please contact our support team.</p>
        `;
        break;

      case "account_frozen":
        subject = "Your Account Has Been Suspended";
        html = `
          <h1>Account Suspended</h1>
          <p>Your account has been temporarily suspended due to a payment issue.</p>
          <p>Please update your payment method to restore access to your account.</p>
          <p><a href="${customerPortalUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Update Payment Method</a></p>
        `;
        break;

      case "subscription_cancelled":
        subject = "Your Subscription Has Been Cancelled";
        html = `
          <h1>Subscription Cancelled</h1>
          <p>Your subscription has been cancelled as requested.</p>
          <p>You'll continue to have access until the end of your current billing period.</p>
          <p>We're sorry to see you go! If you change your mind, you can reactivate your subscription at any time.</p>
          <p><a href="${customerPortalUrl}" style="background: #0070f3; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Manage Subscription</a></p>
        `;
        break;

      default:
        throw new Error(`Unknown notification type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "Billing <billing@resend.dev>",
      to: [email],
      subject: subject,
      html: html,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, messageId: emailResponse.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Error sending notification:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
