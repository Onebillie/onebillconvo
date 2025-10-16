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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    // Get user's business
    const { data: businessUser } = await supabase
      .from("business_users")
      .select("business_id")
      .eq("user_id", user.id)
      .single();

    if (!businessUser) {
      return new Response(JSON.stringify({ warning: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get business details
    const { data: business } = await supabase
      .from("businesses")
      .select("subscription_tier, message_count_current_period, subscription_ends_at, credit_balance, is_unlimited")
      .eq("id", businessUser.business_id)
      .single();

    if (!business || business.is_unlimited) {
      return new Response(JSON.stringify({ warning: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Get pricing config
    const { data: pricing } = await supabase
      .from("pricing_config")
      .select("message_limit")
      .eq("tier", business.subscription_tier)
      .single();

    const limit = pricing?.message_limit || 100;
    const used = business.message_count_current_period || 0;
    const percentUsed = (used / limit) * 100;

    let warningType = null;
    let shouldSendEmail = false;

    // Determine warning level
    if (percentUsed >= 95) {
      warningType = "critical";
      shouldSendEmail = true;
    } else if (percentUsed >= 80) {
      warningType = "low";
      shouldSendEmail = true;
    }

    // Check if we already sent this warning recently (within 24 hours)
    if (warningType && shouldSendEmail) {
      const { data: recentWarning } = await supabase
        .from("credit_warnings")
        .select("id")
        .eq("business_id", businessUser.business_id)
        .eq("warning_type", warningType)
        .gte("sent_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .limit(1);

      if (!recentWarning || recentWarning.length === 0) {
        // Send email warning
        const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
        
        await resend.emails.send({
          from: "AlacartChat <noreply@alacartechat.com>",
          to: [user.email!],
          subject: `${warningType === 'critical' ? '🚨 Critical: ' : '⚠️ Warning: '}Message Credits Running Low`,
          html: `
            <h2>Your Message Credits Are Running Low</h2>
            <p>You've used ${used} of ${limit} messages (${percentUsed.toFixed(1)}%) in your current billing period.</p>
            <p><strong>What happens when you run out?</strong></p>
            <ul>
              <li>You won't be able to send new messages</li>
              <li>Your credits will reset on: ${business.subscription_ends_at ? new Date(business.subscription_ends_at).toLocaleDateString() : 'your next billing date'}</li>
            </ul>
            <p><strong>Options to continue messaging:</strong></p>
            <ul>
              <li><a href="${req.headers.get('origin')}/app/settings?tab=subscription">Upgrade your plan</a> for more monthly messages</li>
              <li><a href="${req.headers.get('origin')}/app/settings?tab=subscription">Purchase credit bundles</a> for immediate top-up</li>
            </ul>
            <p>Thank you for using AlacartChat!</p>
          `,
        });

        // Log the warning
        await supabase.from("credit_warnings").insert({
          business_id: businessUser.business_id,
          warning_type: warningType,
          threshold_percent: Math.round(percentUsed),
        });
      }
    }

    return new Response(
      JSON.stringify({
        warning: warningType,
        used,
        limit,
        percentUsed: percentUsed.toFixed(1),
        renewDate: business.subscription_ends_at,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error checking credit warning:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
