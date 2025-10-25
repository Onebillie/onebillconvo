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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all unique businesses with pending notifications
    const { data: businesses, error: bizError } = await supabaseClient
      .from("notification_queue")
      .select("business_id, user_id")
      .eq("sent", false);

    if (bizError) throw bizError;

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No pending notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Group by user
    const userMap = new Map<string, string>();
    businesses.forEach(b => userMap.set(b.user_id, b.business_id));

    const processed: any[] = [];

    for (const [userId, businessId] of userMap.entries()) {
      // Get user preferences
      const { data: prefs } = await supabaseClient
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .eq("business_id", businessId)
        .maybeSingle();

      if (!prefs?.email_enabled || !prefs?.email_address) continue;

      // Determine which notifications to send based on batch interval
      const now = new Date();
      let cutoffTime = new Date();

      switch (prefs.batch_interval) {
        case "immediate":
          cutoffTime = now;
          break;
        case "hourly":
          cutoffTime = new Date(now.getTime() - 60 * 60 * 1000);
          break;
        case "6hours":
          cutoffTime = new Date(now.getTime() - 6 * 60 * 60 * 1000);
          break;
        case "daily":
          cutoffTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
          break;
      }

      // Get pending notifications for this user
      const { data: notifications, error: notifError } = await supabaseClient
        .from("notification_queue")
        .select("*")
        .eq("user_id", userId)
        .eq("business_id", businessId)
        .eq("sent", false)
        .lte("created_at", cutoffTime.toISOString())
        .order("created_at", { ascending: false });

      if (notifError || !notifications || notifications.length === 0) continue;

      // Check for immediate priority
      const immediateNotifs = notifications.filter(n => 
        n.priority === "immediate" || prefs.immediate_channels.includes(n.channel)
      );

      const notificationsToSend = immediateNotifs.length > 0 ? immediateNotifs : notifications;

      // Get business info
      const { data: business } = await supabaseClient
        .from("businesses")
        .select("name")
        .eq("id", businessId)
        .single();

      // Build email content
      const emailHtml = buildEmailTemplate(notificationsToSend, business?.name || "Your Business");

      // Send email
      const emailResult = await supabaseClient.functions.invoke("send-transactional-email", {
        body: {
          to: prefs.email_address,
          subject: `[${business?.name || "Notification"}] You have ${notificationsToSend.length} new notification(s)`,
          html: emailHtml,
        },
      });

      if (emailResult.error) {
        console.error("Error sending email:", emailResult.error);
        continue;
      }

      // Mark notifications as sent
      const notifIds = notificationsToSend.map(n => n.id);
      await supabaseClient
        .from("notification_queue")
        .update({ sent: true, sent_at: now.toISOString() })
        .in("id", notifIds);

      // Auto-apply status if configured
      if (prefs.auto_status_on_priority && prefs.priority_status_id) {
        const priorityNotifs = notificationsToSend.filter(n => n.priority === "immediate");
        for (const notif of priorityNotifs) {
          if (notif.metadata?.conversation_id) {
            await supabaseClient
              .from("conversations")
              .update({ status_id: prefs.priority_status_id })
              .eq("id", notif.metadata.conversation_id);
          }
        }
      }

      processed.push({ userId, count: notificationsToSend.length });
    }

    return new Response(
      JSON.stringify({ success: true, processed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error processing notification queue:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function buildEmailTemplate(notifications: any[], businessName: string): string {
  const notifsByType = notifications.reduce((acc, n) => {
    const type = n.notification_type || "other";
    if (!acc[type]) acc[type] = [];
    acc[type].push(n);
    return acc;
  }, {} as Record<string, any[]>);

  let sectionsHtml = "";

  for (const [type, notifs] of Object.entries(notifsByType)) {
    const typeTitle = type === "message" ? "New Messages" : type === "task" ? "Tasks" : "Notifications";
    sectionsHtml += `
      <div style="margin-bottom: 30px;">
        <h3 style="color: #333; border-bottom: 2px solid #4f46e5; padding-bottom: 10px;">${typeTitle} (${notifs.length})</h3>
        ${notifs.map(n => `
          <div style="background: #f9fafb; border-left: 3px solid ${n.priority === 'immediate' ? '#ef4444' : '#4f46e5'}; padding: 15px; margin: 10px 0; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: start;">
              <div>
                <strong style="color: #111;">${n.title}</strong>
                ${n.priority === 'immediate' ? '<span style="background: #fee2e2; color: #991b1b; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">URGENT</span>' : ''}
                <p style="color: #666; margin: 8px 0 0 0;">${n.message}</p>
                ${n.link ? `<a href="${n.link}" style="color: #4f46e5; text-decoration: none; font-size: 13px;">View →</a>` : ''}
              </div>
              <span style="color: #999; font-size: 12px; white-space: nowrap; margin-left: 15px;">${formatTime(n.created_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  return `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 8px 8px 0 0; text-align: center;">
        <h1 style="color: white; margin: 0; font-size: 24px;">${businessName}</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">Notification Summary</p>
      </div>
      
      <div style="background: white; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        ${sectionsHtml}
        
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
        <p style="color: #666; font-size: 13px; text-align: center; margin: 0;">
          You're receiving this email based on your notification preferences.<br/>
          <a href="${Deno.env.get("SUPABASE_URL")?.replace('supabase.co', 'lovableproject.com')}/app/settings" style="color: #4f46e5;">Manage preferences</a>
        </p>
      </div>
    </div>
  `;
}

function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}h ago`;
  return `${Math.floor(minutes / 1440)}d ago`;
}