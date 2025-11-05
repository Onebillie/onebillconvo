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

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    // Validate API key and get business
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("business_id, is_active, expires_at")
      .eq("key_hash", apiKey)
      .single();

    if (keyErr || !keyRow || !keyRow.is_active || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
      return new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    // Update last_used_at (best effort)
    await admin.from("api_keys").update({ last_used_at: new Date().toISOString() }).eq("key_hash", apiKey);

    // Parse request body safely
    let body: any = {};
    try {
      if (req.method !== "GET") {
        body = await req.json();
      }
    } catch (_) {
      body = {};
    }

    const resource = body.resource || url.searchParams.get("resource");

    if (resource === "conversations") {
      const { data, error } = await admin
        .from("conversations")
        .select(`
          id, 
          customer_id, 
          last_message_at,
          status,
          status_tag_id,
          assigned_to,
          created_at,
          updated_at,
          priority,
          metadata,
          customer:customers(id, name, email, phone, whatsapp_phone, avatar, last_contact_method),
          last_message:messages!conversation_id(content, subject, platform, direction, created_at)
        `) 
        .eq("business_id", keyRow.business_id)
        .order("last_message_at", { ascending: false, nullsFirst: false });

      if (error) {
        console.error("api-embed-data conversations error", error);
        return new Response(JSON.stringify({ error: "failed_to_load_conversations" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ conversations: data || [] }), { status: 200, headers: corsHeaders });
    }

    if (resource === "messages") {
      const conversationId = body.conversation_id || url.searchParams.get("conversation_id");
      if (!conversationId) {
        return new Response(JSON.stringify({ error: "missing_conversation_id" }), { status: 400, headers: corsHeaders });
      }

      // Ensure conversation belongs to the API key's business
      const { data: conv, error: convErr } = await admin
        .from("conversations")
        .select("id")
        .eq("id", conversationId)
        .eq("business_id", keyRow.business_id)
        .single();

      if (convErr || !conv) {
        return new Response(JSON.stringify({ error: "conversation_not_found" }), { status: 404, headers: corsHeaders });
      }

      const { data, error } = await admin
        .from("messages")
        .select(`*, message_attachments(id, filename, url, type, size, duration_seconds)`) 
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("api-embed-data messages error", error);
        return new Response(JSON.stringify({ error: "failed_to_load_messages" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      return new Response(JSON.stringify({ messages: data || [] }), { status: 200, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "invalid_resource" }), { status: 400, headers: corsHeaders });
  } catch (e) {
    console.error("api-embed-data error", e);
    return new Response(JSON.stringify({ error: "server_error" }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});