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

    // Resource: status_tags
    if (resource === "status_tags") {
      const { data, error } = await admin
        .from("conversation_status_tags")
        .select("id, name, color, icon")
        .eq("business_id", keyRow.business_id)
        .order("name");
      
      if (error) {
        return new Response(JSON.stringify({ error: "failed_to_load_status_tags" }), { status: 500, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ status_tags: data || [] }), { status: 200, headers: corsHeaders });
    }

    // Resource: staff
    if (resource === "staff") {
      const { data, error } = await admin
        .from("business_users")
        .select("user_id, profiles!inner(id, full_name, avatar, department)")
        .eq("business_id", keyRow.business_id);
      
      if (error) {
        return new Response(JSON.stringify({ error: "failed_to_load_staff" }), { status: 500, headers: corsHeaders });
      }
      const staff = (data || []).map((bu: any) => ({
        id: bu.profiles.id,
        full_name: bu.profiles.full_name,
        avatar: bu.profiles.avatar,
        department: bu.profiles.department,
      }));
      return new Response(JSON.stringify({ staff }), { status: 200, headers: corsHeaders });
    }

    // Resource: counts (unread, total, etc.)
    if (resource === "counts") {
      const { count: totalCount } = await admin
        .from("conversations")
        .select("*", { count: 'exact', head: true })
        .eq("business_id", keyRow.business_id)
        .eq("is_archived", false);
      
      const { data: unreadData } = await admin
        .from("conversations")
        .select("id, messages!inner(id, is_read, direction)")
        .eq("business_id", keyRow.business_id)
        .eq("is_archived", false)
        .eq("messages.direction", "inbound")
        .eq("messages.is_read", false);
      
      const unreadCount = new Set(unreadData?.map((c: any) => c.id)).size;
      
      return new Response(JSON.stringify({ counts: { total: totalCount || 0, unread: unreadCount } }), { status: 200, headers: corsHeaders });
    }

    if (resource === "conversations") {
      // Extract filter parameters
      const filters = {
        search: body.search || url.searchParams.get("search") || "",
        unread: body.unread === true || url.searchParams.get("unread") === "true",
        statusIds: body.statusIds || (url.searchParams.get("statusIds") ? url.searchParams.get("statusIds")!.split(",") : []),
        platforms: body.platforms || (url.searchParams.get("platforms") ? url.searchParams.get("platforms")!.split(",") : []),
        assignedTo: body.assignedTo || url.searchParams.get("assignedTo") || null,
        sortBy: body.sortBy || url.searchParams.get("sortBy") || "newest",
        dateFrom: body.dateFrom || url.searchParams.get("dateFrom") || null,
        dateTo: body.dateTo || url.searchParams.get("dateTo") || null,
      };

      let query = admin
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
          customer:customers!inner(id, name, first_name, last_name, email, phone, whatsapp_phone, avatar, last_contact_method),
          assigned_user:profiles!fk_conversations_assigned_to(id, full_name, department),
          conversation_statuses:conversation_statuses(status_tag_id, conversation_status_tags(id, name, color)),
          messages!messages_conversation_id_fkey(id, content, subject, platform, direction, created_at, is_read)
        `) 
        .eq("business_id", keyRow.business_id)
        .eq("is_archived", false);

      // Apply status filter
      if (filters.statusIds.length > 0) {
        query = query.in("status_tag_id", filters.statusIds);
      }

      // Apply assigned filter
      if (filters.assignedTo) {
        if (filters.assignedTo === "unassigned") {
          query = query.is("assigned_to", null);
        } else {
          query = query.eq("assigned_to", filters.assignedTo);
        }
      }

      // Apply date range
      if (filters.dateFrom) {
        query = query.gte("updated_at", filters.dateFrom);
      }
      if (filters.dateTo) {
        query = query.lte("updated_at", filters.dateTo);
      }

      // Apply search (customer name, email, phone)
      if (filters.search) {
        query = query.or(`customers.name.ilike.%${filters.search}%,customers.phone.ilike.%${filters.search}%,customers.email.ilike.%${filters.search}%`);
      }

      // Sorting
      const ascending = filters.sortBy === "oldest";
      query = query
        .order("last_message_at", { ascending, nullsFirst: false })
        .order("created_at", { foreignTable: "messages", ascending: false })
        .limit(50)
        .limit(5, { foreignTable: "messages" });

      const { data, error } = await query;

      if (error) {
        console.error("api-embed-data conversations error", error);
        return new Response(JSON.stringify({ error: "failed_to_load_conversations" }), {
          status: 500,
          headers: corsHeaders,
        });
      }

      // Deduplicate and normalize
      const uniqueConvs = (data || []).reduce((acc: any[], conv: any) => {
        if (!acc.find(c => c.id === conv.id)) acc.push(conv);
        return acc;
      }, []);

      const normalized = uniqueConvs.map((c: any) => {
        const messages = c.messages || [];
        const unreadCount = messages.filter((m: any) => m.direction === "inbound" && !m.is_read).length;
        const lastMsg = messages[0] || null;

        return {
          ...c,
          customer: c.customer,
          unread_count: unreadCount,
          last_message: lastMsg ? {
            content: lastMsg.content,
            subject: lastMsg.subject,
            platform: lastMsg.platform,
            direction: lastMsg.direction,
            created_at: lastMsg.created_at,
          } : null,
          status_tags: (c.conversation_statuses || []).map((s: any) => ({
            id: s.conversation_status_tags?.id,
            name: s.conversation_status_tags?.name,
            color: s.conversation_status_tags?.color,
          })),
        };
      });

      return new Response(JSON.stringify({ conversations: normalized }), { status: 200, headers: corsHeaders });
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