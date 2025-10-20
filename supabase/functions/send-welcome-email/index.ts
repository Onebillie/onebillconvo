import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { email, name, businessName } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: white; padding: 30px; border: 1px solid #e0e0e0; }
          .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .feature { margin: 15px 0; padding: 15px; background: #f8f9fa; border-left: 4px solid #667eea; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome to À la Carte Chat! 🎉</h1>
          </div>
          <div class="content">
            <p>Hi ${name || "there"},</p>
            
            <p>Thank you for signing up! We're excited to help you deliver exceptional customer experiences across all your communication channels.</p>
            
            <h2>🚀 Getting Started</h2>
            <p>Your account is now active with a 3-day trial. Here's what you can do:</p>
            
            <div class="feature">
              <strong>📱 Connect Your Channels</strong><br>
              Set up WhatsApp Business API, Email, SMS, and embed our chat widget on your website.
            </div>
            
            <div class="feature">
              <strong>🤖 AI Assistant</strong><br>
              Enable our AI assistant to handle customer inquiries 24/7.
            </div>
            
            <div class="feature">
              <strong>👥 Team Collaboration</strong><br>
              Invite your team members and assign conversations efficiently.
            </div>
            
            <div class="feature">
              <strong>📊 Analytics & Insights</strong><br>
              Track response times, customer satisfaction, and team performance.
            </div>
            
            <p style="text-align: center;">
              <a href="${Deno.env.get("APP_URL") || "https://alacartechat.com"}/dashboard" class="button">
                Go to Dashboard
              </a>
            </p>
            
            <h3>💡 Need Help?</h3>
            <p>Our team is here to help you succeed:</p>
            <ul>
              <li>📖 <a href="${Deno.env.get("APP_URL") || "https://alacartechat.com"}/docs">Documentation</a></li>
              <li>💬 Live Chat Support (click the chat bubble on our site)</li>
              <li>📧 Email us at support@alacartechat.com</li>
            </ul>
            
            <p>Best regards,<br>The À la Carte Chat Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from À la Carte Chat</p>
            <p>© ${new Date().getFullYear()} À la Carte Chat. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    await supabaseClient.functions.invoke("send-transactional-email", {
      body: {
        to: email,
        subject: "Welcome to À la Carte Chat - Let's Get Started! 🚀",
        html,
        type: "welcome",
      },
    });

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
    );
  }
});
