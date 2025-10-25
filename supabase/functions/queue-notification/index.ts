import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface QueueNotificationRequest {
  userId: string;
  businessId: string;
  notificationType: "message" | "task" | "inmail";
  channel?: "widget" | "whatsapp" | "email" | "facebook" | "instagram" | "sms";
  priority?: "immediate" | "high" | "normal" | "low";
  title: string;
  message: string;
  link?: string;
  metadata?: any;
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

    const body: QueueNotificationRequest = await req.json();

    // Get user preferences
    const { data: prefs } = await supabaseClient
      .from("notification_preferences")
      .select("*")
      .eq("user_id", body.userId)
      .eq("business_id", body.businessId)
      .maybeSingle();

    // Check if this notification type is enabled
    const channelKey = `notify_${body.channel}` as any;
    const typeKey = `notify_${body.notificationType}` as any;
    
    if (prefs && !prefs[channelKey] && !prefs[typeKey]) {
      return new Response(
        JSON.stringify({ message: "Notification type disabled by user" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Determine priority
    let priority = body.priority || "normal";
    if (prefs?.immediate_channels?.includes(body.channel || "")) {
      priority = "immediate";
    }

    // Queue the notification
    const { data, error } = await supabaseClient
      .from("notification_queue")
      .insert({
        user_id: body.userId,
        business_id: body.businessId,
        notification_type: body.notificationType,
        channel: body.channel,
        priority,
        title: body.title,
        message: body.message,
        link: body.link,
        metadata: body.metadata || {},
      })
      .select()
      .single();

    if (error) throw error;

    // If immediate or browser enabled, also send push notification
    if (priority === "immediate" && prefs?.browser_enabled) {
      await supabaseClient.functions.invoke("send-push-notification", {
        body: {
          userIds: [body.userId],
          payload: {
            title: body.title,
            body: body.message,
            icon: "/favicon.png",
            tag: data.id,
            data: { url: body.link || "/app" },
          },
        },
      });
    }

    return new Response(
      JSON.stringify({ success: true, notification: data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error queueing notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});