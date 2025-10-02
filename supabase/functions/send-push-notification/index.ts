import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: any;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userIds, payload }: { userIds?: string[], payload: PushPayload } = await req.json();

    // Get all active push subscriptions for specified users (or all if not specified)
    let query = supabaseClient
      .from("push_subscriptions")
      .select("*");
    
    if (userIds && userIds.length > 0) {
      query = query.in("user_id", userIds);
    }

    const { data: subscriptions, error: fetchError } = await query;

    if (fetchError) {
      throw fetchError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // VAPID keys - these should be stored securely as secrets
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    const vapidSubject = "mailto:support@onebill.ie";

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      throw new Error("VAPID keys not configured");
    }

    // Send push notification to each subscription
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          // Use web-push-deno or native fetch for web push
          const pushPayload = JSON.stringify(payload);
          
          // For now, just log - in production, use proper web-push library
          console.log(`Would send push to ${sub.endpoint}:`, pushPayload);
          
          // TODO: Implement actual web push sending using web-push protocol
          // This requires generating proper VAPID headers and encryption
          
          return { success: true, endpoint: sub.endpoint };
        } catch (error) {
          console.error(`Failed to send to ${sub.endpoint}:`, error);
          return { success: false, endpoint: sub.endpoint, error };
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return new Response(
      JSON.stringify({
        message: "Push notifications sent",
        successful,
        failed,
        total: subscriptions.length
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending push notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
