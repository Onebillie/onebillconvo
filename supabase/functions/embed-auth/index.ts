import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { encode } from "https://deno.land/std@0.224.0/encoding/base64.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-site-id",
};

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return encode(array);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const siteId = req.headers.get("x-site-id");
    if (!siteId) {
      return new Response(JSON.stringify({ error: "Missing site ID" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: siteData, error: siteError } = await supabase
      .from("embed_sites")
      .select("*, embed_tokens!inner(business_id, status, allowed_domains), businesses!inner(id, name, is_frozen)")
      .eq("site_id", siteId)
      .single();

    if (siteError || !siteData) {
      return new Response(JSON.stringify({ error: "Invalid site ID" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (siteData.businesses.is_frozen || siteData.embed_tokens.status !== "active") {
      return new Response(JSON.stringify({ error: "Service unavailable" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { name, email, phone, customData } = body;

    let customerId: string;
    if (email) {
      const { data: existing } = await supabase.from("customers").select("id")
        .eq("business_id", siteData.businesses.id).eq("email", email).single();
      
      if (existing) {
        customerId = existing.id;
      } else {
        const { data: newCustomer } = await supabase.from("customers")
          .insert({ business_id: siteData.businesses.id, name: name || "Anonymous", email, phone, source: "embed_widget", custom_data: customData })
          .select("id").single();
        customerId = newCustomer!.id;
      }
    } else {
      const { data: newCustomer } = await supabase.from("customers")
        .insert({ business_id: siteData.businesses.id, name: name || "Anonymous User", source: "embed_widget", custom_data: customData })
        .select("id").single();
      customerId = newCustomer!.id;
    }

    const { data: activeConv } = await supabase.from("conversations").select("id")
      .eq("customer_id", customerId).eq("business_id", siteData.businesses.id)
      .is("resolved_at", null).order("created_at", { ascending: false }).limit(1).single();

    let conversationId: string;
    if (activeConv) {
      conversationId = activeConv.id;
    } else {
      const { data: newConv } = await supabase.from("conversations")
        .insert({ customer_id: customerId, business_id: siteData.businesses.id, channel: "embed", status: "open" })
        .select("id").single();
      conversationId = newConv!.id;
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await supabase.from("embed_sessions").insert({
      site_id: siteId, session_token: sessionToken, customer_id: customerId,
      conversation_id: conversationId, expires_at: expiresAt.toISOString()
    });

    const { data: customization } = await supabase.from("embed_customizations")
      .select("*").eq("business_id", siteData.businesses.id).single();

    return new Response(JSON.stringify({
      success: true, session_token: sessionToken, customer_id: customerId,
      conversation_id: conversationId, business_name: siteData.businesses.name,
      customization: customization || {}
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
