import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import { renderAsync } from "npm:@react-email/components@0.0.22";
import React from "npm:react@18.3.1";
import { EmailVerification } from "./_templates/email-verification.tsx";
import { MagicLink } from "./_templates/magic-link.tsx";
import { PasswordReset } from "./_templates/password-reset.tsx";
import { TwoFactorCode } from "./_templates/2fa-code.tsx";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AuthEmailRequest {
  type: 'email_verification' | 'magic_link' | 'password_reset' | '2fa_code';
  email: string;
  url?: string;
  code?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const resend = new Resend(resendApiKey);
    const { type, email, url, code }: AuthEmailRequest = await req.json();

    console.log(`=== SENDING AUTH EMAIL ===`);
    console.log(`Type: ${type}`);
    console.log(`To: ${email}`);

    let html: string;
    let subject: string;

    switch (type) {
      case 'email_verification':
        if (!url) throw new Error("Verification URL required");
        subject = "Verify your email address";
        html = await renderAsync(
          React.createElement(EmailVerification, {
            verificationUrl: url,
            email,
          })
        );
        break;

      case 'magic_link':
        if (!url) throw new Error("Magic link URL required");
        subject = "Your magic link to sign in";
        html = await renderAsync(
          React.createElement(MagicLink, {
            magicLinkUrl: url,
            email,
          })
        );
        break;

      case 'password_reset':
        if (!url) throw new Error("Reset URL required");
        subject = "Reset your password";
        html = await renderAsync(
          React.createElement(PasswordReset, {
            resetUrl: url,
            email,
          })
        );
        break;

      case '2fa_code':
        if (!code) throw new Error("2FA code required");
        subject = "Your verification code";
        html = await renderAsync(
          React.createElement(TwoFactorCode, {
            code,
            email,
          })
        );
        break;

      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const emailResponse = await resend.emails.send({
      from: "À La Carte Chat <noreply@alacartechat.com>",
      to: [email],
      subject: subject,
      html: html,
    });

    if (emailResponse.error) {
      console.error("Resend API error:", emailResponse.error);
      throw new Error(`Failed to send email: ${emailResponse.error.message}`);
    }

    console.log("✅ Auth email sent successfully:", emailResponse.data?.id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        messageId: emailResponse.data?.id 
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-auth-email function:", error);
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
