import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
    console.log("[DAILY-REPORT] Starting daily system report generation");

    // Fetch system metrics
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = yesterday.toISOString();

    // Total users and active users
    const { data: allUsers, count: totalUsers } = await supabaseClient
      .from("profiles")
      .select("*", { count: "exact" });

    const activeUsers = allUsers?.filter((u: any) => u.is_active).length || 0;

    // Total businesses
    const { count: totalBusinesses } = await supabaseClient
      .from("businesses")
      .select("*", { count: "exact" });

    // Active subscriptions
    const { count: activeSubscriptions } = await supabaseClient
      .from("businesses")
      .select("*", { count: "exact" })
      .neq("subscription_tier", "free")
      .eq("is_frozen", false);

    // Messages sent in last 24h by channel
    const { data: recentMessages } = await supabaseClient
      .from("messages")
      .select("channel")
      .gte("created_at", yesterdayStr);

    const messagesByChannel = recentMessages?.reduce((acc: any, msg: any) => {
      acc[msg.channel] = (acc[msg.channel] || 0) + 1;
      return acc;
    }, {}) || {};

    // Total revenue (last 30 days - from Stripe metadata)
    const { data: businesses } = await supabaseClient
      .from("businesses")
      .select("subscription_tier, credit_balance");

    const estimatedRevenue = businesses?.reduce((sum: number, b: any) => {
      const tierPrices: any = {
        starter: 29,
        professional: 79,
        enterprise: 199,
      };
      return sum + (tierPrices[b.subscription_tier] || 0);
    }, 0) || 0;

    // Errors in last 24h (from edge function logs - would need analytics query)
    // For now, we'll check critical tables for issues

    // Deal clicks / conversions (from marketing campaigns)
    const { data: campaignClicks } = await supabaseClient
      .from("marketing_campaigns")
      .select("metrics")
      .gte("created_at", yesterdayStr);

    const totalClicks = campaignClicks?.reduce((sum: number, c: any) => {
      return sum + (c.metrics?.clicks || 0);
    }, 0) || 0;

    // Problems found
    const problems: string[] = [];

    // Check for frozen accounts
    const { data: frozenAccounts } = await supabaseClient
      .from("businesses")
      .select("id, name")
      .eq("is_frozen", true);

    if (frozenAccounts && frozenAccounts.length > 0) {
      problems.push(`${frozenAccounts.length} frozen accounts requiring attention`);
    }

    // Check for failed messages
    const { count: failedMessages } = await supabaseClient
      .from("messages")
      .select("*", { count: "exact" })
      .eq("delivery_status", "failed")
      .gte("created_at", yesterdayStr);

    if (failedMessages && failedMessages > 10) {
      problems.push(`${failedMessages} failed message deliveries in last 24h`);
    }

    // Check for low credit balances
    const { data: lowCreditBusinesses } = await supabaseClient
      .from("businesses")
      .select("id, name, credit_balance")
      .lt("credit_balance", 50);

    if (lowCreditBusinesses && lowCreditBusinesses.length > 0) {
      problems.push(`${lowCreditBusinesses.length} businesses with low credit balance (<50)`);
    }

    // Generate HTML email
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .metric-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin: 20px 0; }
            .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; }
            .metric-value { font-size: 32px; font-weight: bold; color: #667eea; }
            .metric-label { color: #666; font-size: 14px; margin-top: 5px; }
            .problem { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 10px 0; border-radius: 4px; }
            .channel-stats { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Daily System Report</h1>
              <p>${now.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
            </div>

            <div class="metric-grid">
              <div class="metric">
                <div class="metric-value">${totalUsers || 0}</div>
                <div class="metric-label">Total Users</div>
                <div style="font-size: 12px; color: #28a745; margin-top: 5px;">✓ ${activeUsers} active</div>
              </div>
              
              <div class="metric">
                <div class="metric-value">${totalBusinesses || 0}</div>
                <div class="metric-label">Total Businesses</div>
                <div style="font-size: 12px; color: #28a745; margin-top: 5px;">✓ ${activeSubscriptions} subscribed</div>
              </div>
              
              <div class="metric">
                <div class="metric-value">$${estimatedRevenue.toLocaleString()}</div>
                <div class="metric-label">Monthly Recurring Revenue</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">Estimated from active subscriptions</div>
              </div>
              
              <div class="metric">
                <div class="metric-value">${Object.values(messagesByChannel).reduce((a: any, b: any) => a + b, 0)}</div>
                <div class="metric-label">Messages (24h)</div>
                <div style="font-size: 12px; color: #666; margin-top: 5px;">Across all channels</div>
              </div>
            </div>

            <div class="channel-stats">
              <h3>📨 Message Breakdown (Last 24h)</h3>
              <ul style="list-style: none; padding: 0;">
                ${Object.entries(messagesByChannel).map(([channel, count]) => `
                  <li style="padding: 8px 0; border-bottom: 1px solid #eee;">
                    <strong>${channel.toUpperCase()}:</strong> ${count} messages
                  </li>
                `).join("")}
              </ul>
            </div>

            <div class="channel-stats">
              <h3>🎯 Marketing Performance (24h)</h3>
              <ul style="list-style: none; padding: 0;">
                <li style="padding: 8px 0;"><strong>Campaign Clicks:</strong> ${totalClicks}</li>
              </ul>
            </div>

            ${problems.length > 0 ? `
              <div style="margin: 20px 0;">
                <h3 style="color: #d9534f;">⚠️ Issues Detected (${problems.length})</h3>
                ${problems.map(p => `<div class="problem">• ${p}</div>`).join("")}
              </div>
            ` : `
              <div style="background: #d4edda; border-left: 4px solid #28a745; padding: 15px; margin: 20px 0; border-radius: 4px;">
                ✅ <strong>No Critical Issues Detected</strong> - System running smoothly
              </div>
            `}

            <div class="footer">
              <p>This is an automated daily report from À La Carte Chat</p>
              <p>For urgent issues, please check the critical alerts system</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Send email
    const { error: emailError } = await resend.emails.send({
      from: "System Reports <reports@alacartesaas.com>",
      to: ["hello@alacartesaas.com"],
      subject: `📊 Daily System Report - ${now.toLocaleDateString()}`,
      html: emailHtml,
    });

    if (emailError) {
      console.error("[DAILY-REPORT] Failed to send email:", emailError);
      throw emailError;
    }

    console.log("[DAILY-REPORT] Daily report sent successfully");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Daily report sent successfully",
        metrics: {
          totalUsers,
          activeUsers,
          totalBusinesses,
          activeSubscriptions,
          estimatedRevenue,
          messagesByChannel,
          totalClicks,
          problemsFound: problems.length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("[DAILY-REPORT] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
