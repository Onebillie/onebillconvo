import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Find user's business
    let { data: bu } = await supabase
      .from("business_users")
      .select("business_id")
      .eq("user_id", userId)
      .maybeSingle();

    let businessId = bu?.business_id as string | null;
    if (!businessId) {
      // Create or retrieve user's business via RPC
      const { data: rpcBiz, error: rpcErr } = await supabase.rpc(
        "get_or_create_user_business",
        { _user_id: userId }
      );
      if (rpcErr || !rpcBiz) {
        throw new Error(`Failed to resolve business: ${rpcErr?.message}`);
      }
      businessId = rpcBiz as string;
    }

    // If WhatsApp account exists for this business, do nothing
    const { data: existing } = await supabase
      .from("whatsapp_accounts")
      .select("id")
      .eq("business_id", businessId)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(
        JSON.stringify({ seeded: false, reason: "account_exists" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // SECURITY FIX: Do not automatically seed WhatsApp credentials
    // Each business must configure their own WhatsApp account manually
    // This prevents credential sharing between businesses
    return new Response(
      JSON.stringify({ 
        seeded: false, 
        reason: "auto_seeding_disabled",
        message: "WhatsApp accounts must be configured manually for security reasons. Please add your WhatsApp Business API credentials in Settings > Channel Settings > WhatsApp."
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

    // DEPRECATED: Automatic seeding from environment secrets
    // This code is kept for reference but will never execute
    /*
    // Read secrets
    const PHONE_ID = Deno.env.get("WHATSAPP_PHONE_ID");
    const BUSINESS_ACCOUNT_ID = Deno.env.get("WHATSAPP_BUSINESS_ACCOUNT_ID");
    const ACCESS_TOKEN = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
    const VERIFY_TOKEN = Deno.env.get("WHATSAPP_VERIFY_TOKEN") ?? crypto.randomUUID();

    if (!PHONE_ID || !BUSINESS_ACCOUNT_ID || !ACCESS_TOKEN) {
      return new Response(
        JSON.stringify({ seeded: false, reason: "missing_secrets" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert a default account seeded from secrets
    const { data: inserted, error: insErr } = await supabase
      .from("whatsapp_accounts")
      .insert({
        name: "Default WhatsApp",
        phone_number: "",
        phone_number_id: PHONE_ID,
        business_account_id: BUSINESS_ACCOUNT_ID,
        access_token: ACCESS_TOKEN,
        verify_token: VERIFY_TOKEN,
        is_active: true,
        is_default: true,
        business_id: businessId,
        created_by: userId,
      })
      .select("id")
      .single();

    if (insErr) throw insErr;

    return new Response(
      JSON.stringify({ seeded: true, account_id: inserted.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("whatsapp-seed-from-secrets error:", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});