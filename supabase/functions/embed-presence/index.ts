import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "Missing session token" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const action = body.action;

    // Validate session
    const { data: session, error: sessionError } = await supabase
      .from("embed_sessions")
      .select("*")
      .eq("session_token", sessionToken)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: "Invalid or expired session" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "heartbeat") {
      // Update last_presence_at timestamp
      const { error: updateError } = await supabase
        .from("embed_sessions")
        .update({ last_presence_at: new Date().toISOString() })
        .eq("session_token", sessionToken);

      if (updateError) {
        console.error("[embed-presence] Failed to update heartbeat:", updateError);
        return new Response(JSON.stringify({ error: "Failed to update presence" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Get online staff count for this business
      const { data: siteData } = await supabase
        .from("embed_sites")
        .select("embed_tokens:embed_token_id(business_id)")
        .eq("site_id", session.site_id)
        .single();

      let onlineStaffCount = 0;
      if (siteData?.embed_tokens?.business_id) {
        // Count staff members online in last 2 minutes
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const { count } = await supabase
          .from("business_users")
          .select("*", { count: "exact", head: true })
          .eq("business_id", siteData.embed_tokens.business_id)
          .gt("last_seen", twoMinutesAgo);
        
        onlineStaffCount = count || 0;
      }

      return new Response(JSON.stringify({
        success: true,
        online_staff_count: onlineStaffCount,
        session_valid: true
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), 
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("[embed-presence] Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
