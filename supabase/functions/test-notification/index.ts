import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    // Get user's business
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("id, name")
      .eq("owner_id", user.id)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found");
    }

    // Get notification preferences
    const { data: prefs } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", user.id)
      .eq("business_id", business.id)
      .maybeSingle();

    const results: any = {
      browser: null,
      email: null,
    };

    // Send browser notification if enabled
    if (prefs?.browser_enabled) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const pushResult = await serviceClient.functions.invoke("send-push-notification", {
        body: {
          userIds: [user.id],
          payload: {
            title: "Test Notification",
            body: "This is a test notification from your business dashboard",
            icon: "/favicon.png",
            tag: "test-notification",
            data: { url: "/app/settings" },
          },
        },
      });

      results.browser = pushResult.data;
    }

    // Send test email if enabled
    if (prefs?.email_enabled && prefs?.email_address) {
      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      const emailResult = await serviceClient.functions.invoke("send-transactional-email", {
        body: {
          to: prefs.email_address,
          subject: "Test Notification - " + business.name,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2>Test Notification</h2>
              <p>This is a test email notification from your business dashboard: <strong>${business.name}</strong></p>
              <p>If you're seeing this, your email notifications are working correctly!</p>
              <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;" />
              <p style="color: #666; font-size: 12px;">
                You received this email because you tested notifications in your dashboard settings.
              </p>
            </div>
          `,
        },
      });

      results.email = emailResult.data;
    }

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error sending test notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});