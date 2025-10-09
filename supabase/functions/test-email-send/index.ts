import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
    const { testType, toEmail } = await req.json();

    console.log(`[TEST-EMAIL] Testing email: ${testType} to ${toEmail}`);

    let emailContent = {
      from: "À La Carte Chat <hello@alacartechat.com>",
      to: [toEmail || "hello@alacartesaas.com"],
      subject: "",
      html: "",
    };

    switch (testType) {
      case "basic":
        emailContent.subject = "✅ Test Email - System Working";
        emailContent.html = `
          <h1>Email System Test</h1>
          <p>This is a test email from your À La Carte Chat system.</p>
          <p><strong>Status:</strong> Email delivery is working correctly!</p>
          <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
        `;
        break;

      case "payment_success":
        emailContent.subject = "🎉 Payment Successful - Test";
        emailContent.html = `
          <h1>Payment Received</h1>
          <p>Thank you for your payment!</p>
          <p><strong>Amount:</strong> $29.00</p>
          <p><strong>Plan:</strong> Starter</p>
          <p><strong>Invoice:</strong> <a href="#">View Invoice</a></p>
        `;
        break;

      case "payment_failed":
        emailContent.subject = "⚠️ Payment Failed - Test";
        emailContent.html = `
          <h1>Payment Failed</h1>
          <p>We were unable to process your payment.</p>
          <p><strong>Action Required:</strong> Please update your payment method.</p>
          <p><a href="#">Update Payment Method</a></p>
        `;
        break;

      case "usage_alert":
        emailContent.subject = "⚠️ API Usage Alert - Test";
        emailContent.html = `
          <h1>API Usage Alert</h1>
          <p>Your API usage is approaching the limit:</p>
          <ul>
            <li><strong>VirusTotal:</strong> 450 / 500 (90%)</li>
            <li><strong>Resend:</strong> 2,500 / 3,000 emails (83%)</li>
          </ul>
          <p><a href="https://alacartechat.com/admin/testing">View Usage Dashboard</a></p>
        `;
        break;
    }

    const { data, error } = await resend.emails.send(emailContent);

    if (error) {
      throw error;
    }

    console.log(`[TEST-EMAIL] Email sent successfully:`, data);

    return new Response(
      JSON.stringify({ 
        success: true, 
        emailId: data?.id,
        message: "Test email sent successfully"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[TEST-EMAIL] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
