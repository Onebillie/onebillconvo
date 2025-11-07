import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKeyHeader = req.headers.get("x-api-key");
    const { apiKey: apiKeyBody, metadata } = await req.json().catch(() => ({ apiKey: null, metadata: {} }));
    const apiKey = apiKeyHeader || apiKeyBody;

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "missing_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: "server_misconfigured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Validate API key and get permission level
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("id, business_id, permission_level, is_active, expires_at")
      .eq("key_hash", apiKey)
      .single();

    if (keyErr || !keyRow || !keyRow.is_active || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
      console.error("Invalid API key:", keyErr);
      return new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Update API key last_used_at
    await admin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRow.id);

    // Generate session token
    const sessionToken = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create embed session
    const { data: session, error: sessionErr } = await admin
      .from("embed_sessions")
      .insert({
        business_id: keyRow.business_id,
        api_key_id: keyRow.id,
        session_token: sessionToken,
        permission_level: keyRow.permission_level,
        metadata: metadata || {},
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (sessionErr) {
      console.error("Failed to create session:", sessionErr);
      return new Response(JSON.stringify({ error: "session_creation_failed" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    console.log(`Created embed session for business ${keyRow.business_id} with ${keyRow.permission_level} access`);

    return new Response(
      JSON.stringify({
        session_token: sessionToken,
        business_id: keyRow.business_id,
        permission_level: keyRow.permission_level,
        expires_at: expiresAt.toISOString(),
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (e) {
    console.error("create-embed-session error", e);
    return new Response(JSON.stringify({ error: "server_error", details: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
