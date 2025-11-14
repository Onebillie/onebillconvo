import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface WebhookPayload {
  event: "new_message" | "new_inmail";
  has_notification: 1;
  timestamp: string;
  data: {
    id: string;
    customer_name?: string;
    preview: string;
    link: string;
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Missing Supabase configuration");
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    const { event_type, message_id, inmail_id, business_id } = await req.json();

    // Fetch webhook settings for this business
    const { data: settings, error: settingsError } = await supabase
      .from("business_settings")
      .select("notification_webhook_url, notification_webhook_enabled, notification_webhook_secret, notification_events")
      .eq("business_id", business_id)
      .single();

    if (settingsError || !settings?.notification_webhook_enabled || !settings.notification_webhook_url) {
      console.log("Webhooks not enabled or configured for business", business_id);
      return new Response(JSON.stringify({ success: false, reason: "webhooks_not_configured" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if this event type is enabled
    const enabledEvents = settings.notification_events as string[] || [];
    if (!enabledEvents.includes(event_type)) {
      console.log(`Event type ${event_type} not enabled for business ${business_id}`);
      return new Response(JSON.stringify({ success: false, reason: "event_not_enabled" }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let payload: WebhookPayload;
    const baseUrl = supabaseUrl.replace(".supabase.co", ".lovable.app") || "https://yourdomain.com";

    if (event_type === "new_message" && message_id) {
      // Fetch message details
      const { data: message, error: messageError } = await supabase
        .from("messages")
        .select(`
          id,
          content,
          conversation_id,
          conversations (
            customer_id,
            customers (name)
          )
        `)
        .eq("id", message_id)
        .single();

      if (messageError || !message) {
        throw new Error("Failed to fetch message");
      }

      const customerName = (message.conversations as any)?.customers?.name || "Unknown Customer";
      const preview = message.content?.substring(0, 50) || "New message";

      payload = {
        event: "new_message",
        has_notification: 1,
        timestamp: new Date().toISOString(),
        data: {
          id: message.id,
          customer_name: customerName,
          preview: preview,
          link: `${baseUrl}/app/dashboard?conversation=${message.conversation_id}`,
        },
      };
    } else if (event_type === "new_inmail" && inmail_id) {
      // Fetch inmail details
      const { data: inmail, error: inmailError } = await supabase
        .from("in_mail_messages")
        .select("id, subject, content, sender_id, profiles!in_mail_messages_sender_id_fkey(full_name)")
        .eq("id", inmail_id)
        .single();

      if (inmailError || !inmail) {
        throw new Error("Failed to fetch inmail");
      }

      const senderName = (inmail.profiles as any)?.full_name || "Team Member";
      const preview = inmail.subject || inmail.content?.substring(0, 50) || "New internal message";

      payload = {
        event: "new_inmail",
        has_notification: 1,
        timestamp: new Date().toISOString(),
        data: {
          id: inmail.id,
          customer_name: senderName,
          preview: preview,
          link: `${baseUrl}/app/dashboard?inmail=${inmail.id}`,
        },
      };
    } else {
      throw new Error("Invalid event type or missing ID");
    }

    // Send webhook
    const webhookResponse = await fetch(settings.notification_webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(settings.notification_webhook_secret && {
          "X-Webhook-Secret": settings.notification_webhook_secret,
        }),
      },
      body: JSON.stringify(payload),
    });

    if (!webhookResponse.ok) {
      console.error("Webhook delivery failed:", await webhookResponse.text());
      return new Response(
        JSON.stringify({ 
          success: false, 
          reason: "webhook_delivery_failed",
          status: webhookResponse.status 
        }), 
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`Webhook delivered successfully to ${settings.notification_webhook_url}`);

    return new Response(JSON.stringify({ success: true, delivered: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Webhook notification error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
