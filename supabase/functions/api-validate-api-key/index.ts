import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const apiKeyHeader = req.headers.get("x-api-key");
    const apiKeyQuery = url.searchParams.get("apiKey");
    const apiKey = apiKeyHeader || apiKeyQuery;

    if (!apiKey) {
      return new Response(JSON.stringify({ valid: false, error: "missing_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ valid: false, error: "server_misconfigured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Validate API key
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("business_id, is_active, expires_at")
      .eq("key_hash", apiKey)
      .single();

    if (keyErr || !keyRow || !keyRow.is_active || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
      return new Response(JSON.stringify({ valid: false, error: "invalid_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Update last_used_at (best-effort)
    await admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("key_hash", apiKey);

    // Fetch optional customization to reduce RLS issues on client
    const { data: customization } = await admin
      .from("embed_customizations")
      .select("*")
      .eq("business_id", keyRow.business_id)
      .maybeSingle();

    return new Response(
      JSON.stringify({ valid: true, business_id: keyRow.business_id, customization }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error("api-validate-api-key error", e);
    return new Response(JSON.stringify({ valid: false, error: "server_error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
