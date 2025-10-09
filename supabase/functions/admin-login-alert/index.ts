import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface AdminLoginAlert {
  userId: string;
  email: string;
  timestamp: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, timestamp }: AdminLoginAlert = await req.json();

    console.log(`[ADMIN-LOGIN-ALERT] SuperAdmin login detected for user ${userId} (${email})`);

    // Get IP address from request headers
    const ipAddress = req.headers.get('x-forwarded-for') || 
                     req.headers.get('x-real-ip') || 
                     'Unknown';

    // Send security alert email
    const emailResponse = await resend.emails.send({
      from: "Security Alerts <alerts@alacartechat.com>",
      to: ["hello@alacartesaas.com"],
      subject: "🔐 SuperAdmin Portal Access Detected",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert-box { 
              background: linear-gradient(135deg, #dc2626, #ea580c);
              color: white;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 20px;
            }
            .alert-title { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
            .details { 
              background: #f9fafb;
              border: 1px solid #e5e7eb;
              border-radius: 8px;
              padding: 20px;
              margin-bottom: 20px;
            }
            .detail-row { 
              display: flex;
              padding: 8px 0;
              border-bottom: 1px solid #e5e7eb;
            }
            .detail-row:last-child { border-bottom: none; }
            .detail-label { font-weight: bold; width: 150px; color: #6b7280; }
            .detail-value { color: #111827; }
            .warning {
              background: #fef3c7;
              border-left: 4px solid #f59e0b;
              padding: 15px;
              margin: 20px 0;
              border-radius: 4px;
            }
            .footer {
              text-align: center;
              color: #6b7280;
              font-size: 12px;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #e5e7eb;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="alert-box">
              <div class="alert-title">🔐 SuperAdmin Portal Access</div>
              <p>A successful login to the SuperAdmin Portal has been detected.</p>
            </div>

            <div class="details">
              <h3 style="margin-top: 0; color: #111827;">Login Details</h3>
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${email}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">User ID:</div>
                <div class="detail-value">${userId}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">Timestamp:</div>
                <div class="detail-value">${new Date(timestamp).toLocaleString('en-US', {
                  dateStyle: 'full',
                  timeStyle: 'long'
                })}</div>
              </div>
              <div class="detail-row">
                <div class="detail-label">IP Address:</div>
                <div class="detail-value">${ipAddress}</div>
              </div>
            </div>

            <div class="warning">
              <strong>⚠️ Security Notice</strong><br>
              If this login was not authorized by you, please take immediate action:
              <ul style="margin: 10px 0;">
                <li>Reset your admin password immediately</li>
                <li>Review recent admin activity</li>
                <li>Check for unauthorized changes</li>
                <li>Contact your security team</li>
              </ul>
            </div>

            <div class="footer">
              <p>This is an automated security alert from À La Carte Chat SuperAdmin Portal</p>
              <p>You are receiving this email because you are listed as a SuperAdmin contact</p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log(`[ADMIN-LOGIN-ALERT] Security email sent successfully:`, emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("[ADMIN-LOGIN-ALERT] Error sending security alert:", error);
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
