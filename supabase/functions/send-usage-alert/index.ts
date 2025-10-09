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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[USAGE-ALERT] Checking API usage limits");

    // Get current usage data
    const { data: usageData, error: usageError } = await supabase
      .from("api_usage_tracking")
      .select("*")
      .eq("usage_date", new Date().toISOString().split('T')[0]);

    if (usageError) throw usageError;

    const alerts = [];
    const alertEmail = "hello@alacartesaas.com";

    for (const service of usageData || []) {
      const usagePercent = (service.usage_count / service.usage_limit) * 100;
      let alertLevel = null;

      if (usagePercent >= 95) alertLevel = 95;
      else if (usagePercent >= 90) alertLevel = 90;
      else if (usagePercent >= 80) alertLevel = 80;

      if (alertLevel) {
        // Check if alert already sent today
        const { data: existingAlert } = await supabase
          .from("usage_alerts_sent")
          .select("*")
          .eq("service_name", service.service_name)
          .eq("alert_level", alertLevel)
          .eq("alert_date", new Date().toISOString().split('T')[0])
          .single();

        if (!existingAlert) {
          alerts.push({
            service: service.service_name,
            usage: service.usage_count,
            limit: service.usage_limit,
            percent: usagePercent.toFixed(1),
            level: alertLevel
          });

          // Record that we sent this alert
          await supabase.from("usage_alerts_sent").insert({
            service_name: service.service_name,
            alert_level: alertLevel,
            alert_date: new Date().toISOString().split('T')[0]
          });
        }
      }
    }

    if (alerts.length > 0) {
      console.log("[USAGE-ALERT] Sending alert email for:", alerts);

      const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

      const alertHtml = `
        <h1>⚠️ API Usage Alert</h1>
        <p>Your À La Carte Chat system has high API usage:</p>
        <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
          <thead>
            <tr style="background: #f4f4f4;">
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Service</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Usage</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Limit</th>
              <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">Percent</th>
            </tr>
          </thead>
          <tbody>
            ${alerts.map(a => `
              <tr>
                <td style="padding: 10px; border: 1px solid #ddd;"><strong>${a.service}</strong></td>
                <td style="padding: 10px; border: 1px solid #ddd;">${a.usage.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd;">${a.limit.toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #ddd; color: ${a.level >= 95 ? 'red' : a.level >= 90 ? 'orange' : '#666'};">
                  ${a.percent}%
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <p><strong>Recommendations:</strong></p>
        <ul>
          ${alerts.find(a => a.service === 'virustotal') ? '<li>Consider upgrading VirusTotal to paid plan ($200/month for unlimited)</li>' : ''}
          ${alerts.find(a => a.service === 'resend') ? '<li>Consider upgrading Resend plan or reducing email frequency</li>' : ''}
          ${alerts.find(a => a.service.includes('supabase')) ? '<li>Monitor database size and consider cleanup or upgrade</li>' : ''}
        </ul>
        <p><a href="https://alacartechat.com/admin/testing" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Usage Dashboard</a></p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">À La Carte Chat System - Automated Alert</p>
      `;

      const { error: emailError } = await resend.emails.send({
        from: "À La Carte Chat Alerts <hello@alacartechat.com>",
        to: [alertEmail],
        subject: `⚠️ API Usage Alert - ${alerts[0].service} at ${alerts[0].percent}%`,
        html: alertHtml
      });

      if (emailError) throw emailError;

      console.log("[USAGE-ALERT] Alert email sent successfully");
    } else {
      console.log("[USAGE-ALERT] No alerts needed - usage is under 80%");
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        alertsSent: alerts.length,
        alerts 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[USAGE-ALERT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
