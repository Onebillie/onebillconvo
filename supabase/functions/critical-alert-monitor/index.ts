import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CriticalAlert {
  type: string;
  severity: "critical" | "high" | "medium";
  message: string;
  details: any;
  timestamp: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

  try {
    console.log("[CRITICAL-ALERT] Running critical alert monitor");

    const alerts: CriticalAlert[] = [];
    const now = new Date();
    const lastHour = new Date(now.getTime() - 60 * 60 * 1000).toISOString();

    // 1. Check for mass message failures
    const { count: recentFailures } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact" })
      .eq("delivery_status", "failed")
      .gte("created_at", lastHour);

    if (recentFailures && recentFailures > 50) {
      alerts.push({
        type: "MASS_MESSAGE_FAILURE",
        severity: "critical",
        message: `${recentFailures} message failures in the last hour`,
        details: { count: recentFailures, timeWindow: "1 hour" },
        timestamp: now.toISOString(),
      });
    }

    // 2. Check for database errors or connection issues
    try {
      const { error: dbTestError } = await supabaseClient
        .from("businesses")
        .select("id")
        .limit(1);

      if (dbTestError) {
        alerts.push({
          type: "DATABASE_ERROR",
          severity: "critical",
          message: "Database connection or query error detected",
          details: { error: dbTestError.message },
          timestamp: now.toISOString(),
        });
      }
    } catch (err: any) {
      alerts.push({
        type: "DATABASE_CONNECTION_FAILURE",
        severity: "critical",
        message: "Unable to connect to database",
        details: { error: err.message },
        timestamp: now.toISOString(),
      });
    }

    // 3. Check for payment processing failures
    const { data: recentPaymentErrors } = await supabaseClient
      .from("businesses")
      .select("id, name, last_error")
      .not("last_error", "is", null)
      .gte("updated_at", lastHour);

    if (recentPaymentErrors && recentPaymentErrors.length > 5) {
      alerts.push({
        type: "PAYMENT_PROCESSING_ERRORS",
        severity: "high",
        message: `${recentPaymentErrors.length} businesses experiencing payment errors`,
        details: { businesses: recentPaymentErrors.slice(0, 10) },
        timestamp: now.toISOString(),
      });
    }

    // 4. Check for API rate limit exhaustion (VirusTotal, Resend, etc.)
    const { data: apiUsage } = await supabaseClient
      .from("api_usage_tracking")
      .select("*")
      .eq("usage_date", now.toISOString().split("T")[0]);

    for (const api of apiUsage || []) {
      const usagePercent = (api.usage_count / api.usage_limit) * 100;
      if (usagePercent > 95) {
        alerts.push({
          type: "API_LIMIT_CRITICAL",
          severity: "high",
          message: `${api.service_name} API at ${usagePercent.toFixed(1)}% capacity`,
          details: {
            service: api.service_name,
            used: api.usage_count,
            limit: api.usage_limit,
          },
          timestamp: now.toISOString(),
        });
      }
    }

    // 5. Check for edge function failures
    // Note: Would need to query Supabase analytics for this
    // Placeholder for now

    // 6. Check for WhatsApp webhook failures
    const { count: whatsappErrors } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact" })
      .eq("channel", "whatsapp")
      .eq("delivery_status", "failed")
      .gte("created_at", lastHour);

    if (whatsappErrors && whatsappErrors > 20) {
      alerts.push({
        type: "WHATSAPP_WEBHOOK_FAILURE",
        severity: "critical",
        message: `${whatsappErrors} WhatsApp message failures in last hour`,
        details: { count: whatsappErrors },
        timestamp: now.toISOString(),
      });
    }

    // 7. Check for data loss indicators (conversations or messages with missing data)
    const { data: corruptedConversations } = await supabaseClient
      .from("conversations")
      .select("id, customer_id")
      .is("customer_id", null)
      .gte("created_at", lastHour);

    if (corruptedConversations && corruptedConversations.length > 0) {
      alerts.push({
        type: "DATA_INTEGRITY_ISSUE",
        severity: "high",
        message: `${corruptedConversations.length} conversations with missing customer data`,
        details: { conversationIds: corruptedConversations.slice(0, 10).map(c => c.id) },
        timestamp: now.toISOString(),
      });
    }

    // 8. Check for storage issues (approaching limits)
    // This would require checking Supabase storage metrics
    // Placeholder for implementation

    // If critical alerts found, send immediate email
    if (alerts.filter(a => a.severity === "critical").length > 0) {
      const criticalCount = alerts.filter(a => a.severity === "critical").length;
      const highCount = alerts.filter(a => a.severity === "high").length;

      const emailHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 700px; margin: 0 auto; padding: 20px; }
              .header { background: #d9534f; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .alert-critical { background: #f8d7da; border-left: 4px solid #d9534f; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .alert-high { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 15px 0; border-radius: 4px; }
              .alert-title { font-weight: bold; color: #721c24; font-size: 16px; margin-bottom: 8px; }
              .alert-details { font-size: 13px; color: #666; font-family: monospace; background: #f8f9fa; padding: 10px; border-radius: 4px; margin-top: 8px; }
              .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
              .action-required { background: #d9534f; color: white; padding: 15px; border-radius: 8px; margin: 20px 0; text-align: center; font-weight: bold; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🚨 CRITICAL SYSTEM ALERT</h1>
                <p>${now.toLocaleString()}</p>
              </div>

              <div class="action-required">
                ⚠️ IMMEDIATE ATTENTION REQUIRED ⚠️<br/>
                ${criticalCount} Critical Alert${criticalCount > 1 ? "s" : ""}
                ${highCount > 0 ? ` + ${highCount} High Priority Alert${highCount > 1 ? "s" : ""}` : ""}
              </div>

              ${alerts.map(alert => `
                <div class="alert-${alert.severity}">
                  <div class="alert-title">
                    ${alert.severity === "critical" ? "🔴" : "🟡"} ${alert.type.replace(/_/g, " ")}
                  </div>
                  <div>${alert.message}</div>
                  <div class="alert-details">
                    ${JSON.stringify(alert.details, null, 2)}
                  </div>
                  <div style="font-size: 11px; color: #999; margin-top: 8px;">
                    ${new Date(alert.timestamp).toLocaleString()}
                  </div>
                </div>
              `).join("")}

              <div class="footer">
                <p><strong>Recommended Actions:</strong></p>
                <ul style="text-align: left; display: inline-block;">
                  <li>Check Supabase Edge Function logs immediately</li>
                  <li>Verify third-party service status (Stripe, Twilio, Meta)</li>
                  <li>Check database performance metrics</li>
                  <li>Review recent deployments or changes</li>
                </ul>
                <p style="margin-top: 20px;">
                  <a href="https://app.supabase.com/project/jrtlrnfdqfkjlkpfirzr" 
                     style="background: #667eea; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                    Open Supabase Dashboard
                  </a>
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "Critical Alerts <alerts@alacartesaas.com>",
        to: ["hello@alacartesaas.com"],
        subject: `🚨 CRITICAL: ${criticalCount} System Alert${criticalCount > 1 ? "s" : ""} Detected`,
        html: emailHtml,
      });

      if (emailError) {
        console.error("[CRITICAL-ALERT] Failed to send alert email:", emailError);
      } else {
        console.log("[CRITICAL-ALERT] Critical alert email sent");
      }
    }

    // Log alerts to database for tracking
    if (alerts.length > 0) {
      // Store in a system_alerts table (would need to be created)
      console.log("[CRITICAL-ALERT] Alerts generated:", JSON.stringify(alerts, null, 2));
    } else {
      console.log("[CRITICAL-ALERT] No critical issues detected");
    }

    return new Response(
      JSON.stringify({
        success: true,
        alertsDetected: alerts.length,
        criticalAlerts: alerts.filter(a => a.severity === "critical").length,
        alerts: alerts,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[CRITICAL-ALERT] Error in monitor:", error);
    
    // Send error notification
    try {
      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
      await resend.emails.send({
        from: "Critical Alerts <alerts@alacartesaas.com>",
        to: ["hello@alacartesaas.com"],
        subject: "🚨 CRITICAL: Alert Monitor Failure",
        html: `<p>The critical alert monitoring system itself has failed!</p><pre>${error.message}</pre>`,
      });
    } catch (e) {
      console.error("Failed to send monitor failure alert:", e);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
