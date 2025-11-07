import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.58.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-session-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const sessionToken = req.headers.get("x-session-token");
    if (!sessionToken) {
      return new Response(JSON.stringify({ error: "missing_session_token" }), {
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

    const { operation, data } = await req.json();

    if (!operation) {
      return new Response(JSON.stringify({ error: "missing_operation" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate session based on required permission for operation
    let requiredPermission = 'read_only';
    if (['send_message', 'update_status', 'assign_conversation'].includes(operation)) {
      requiredPermission = 'agent';
    }
    if (['delete_conversation', 'manage_settings'].includes(operation)) {
      requiredPermission = 'admin';
    }

    const { data: validationResult } = await admin.rpc('is_valid_embed_session', {
      _session_token: sessionToken,
      _required_permission: requiredPermission
    });

    const sessionValid = validationResult?.[0];
    
    if (!sessionValid?.valid) {
      return new Response(JSON.stringify({ error: "invalid_session_or_insufficient_permissions" }), {
        status: 403,
        headers: corsHeaders,
      });
    }

    const businessId = sessionValid.business_id;
    const permissionLevel = sessionValid.permission_level;

    console.log(`Embed operation: ${operation} for business ${businessId} with ${permissionLevel} permission`);

    // Handle different operations
    let result;
    
    switch (operation) {
      case 'send_message':
        result = await handleSendMessage(admin, businessId, data);
        break;
      
      case 'update_status':
        result = await handleUpdateStatus(admin, businessId, data);
        break;
      
      case 'assign_conversation':
        result = await handleAssignConversation(admin, businessId, data);
        break;
      
      case 'create_task':
        result = await handleCreateTask(admin, businessId, data);
        break;
      
      case 'delete_conversation':
        result = await handleDeleteConversation(admin, businessId, data);
        break;
      
      default:
        return new Response(JSON.stringify({ error: "unknown_operation" }), {
          status: 400,
          headers: corsHeaders,
        });
    }

    return new Response(
      JSON.stringify({ success: true, data: result }),
      { status: 200, headers: corsHeaders }
    );

  } catch (e) {
    console.error("embed-operation error", e);
    return new Response(JSON.stringify({ error: "server_error", details: e.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});

async function handleSendMessage(admin: any, businessId: string, data: any) {
  const { conversation_id, content, attachments } = data;

  // Verify conversation belongs to business
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("business_id", businessId)
    .single();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  // Insert message
  const { data: message, error } = await admin
    .from("messages")
    .insert({
      conversation_id,
      content,
      direction: "outbound",
      sender_type: "embed",
      metadata: { source: "embed" }
    })
    .select()
    .single();

  if (error) throw error;

  // Handle attachments if provided
  if (attachments && attachments.length > 0) {
    const attachmentInserts = attachments.map((att: any) => ({
      message_id: message.id,
      url: att.url,
      type: att.type,
      name: att.name,
      size: att.size
    }));

    await admin.from("message_attachments").insert(attachmentInserts);
  }

  return message;
}

async function handleUpdateStatus(admin: any, businessId: string, data: any) {
  const { conversation_id, status_tag_id } = data;

  // Verify conversation belongs to business
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("business_id", businessId)
    .single();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const { error } = await admin
    .from("conversation_statuses")
    .upsert({
      conversation_id,
      status_tag_id
    });

  if (error) throw error;

  return { conversation_id, status_tag_id };
}

async function handleAssignConversation(admin: any, businessId: string, data: any) {
  const { conversation_id, user_id } = data;

  // Verify conversation belongs to business
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("business_id", businessId)
    .single();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const { error } = await admin
    .from("conversations")
    .update({ assigned_to: user_id })
    .eq("id", conversation_id);

  if (error) throw error;

  return { conversation_id, assigned_to: user_id };
}

async function handleCreateTask(admin: any, businessId: string, data: any) {
  const { conversation_id, customer_id, title, description, priority, due_date, assigned_to } = data;

  // Verify conversation belongs to business
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("business_id", businessId)
    .single();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const { data: task, error } = await admin
    .from("tasks")
    .insert({
      conversation_id,
      customer_id,
      title,
      description,
      priority: priority || 'medium',
      status: 'pending',
      due_date,
      assigned_to
    })
    .select()
    .single();

  if (error) throw error;

  return task;
}

async function handleDeleteConversation(admin: any, businessId: string, data: any) {
  const { conversation_id } = data;

  // Verify conversation belongs to business
  const { data: conv } = await admin
    .from("conversations")
    .select("id")
    .eq("id", conversation_id)
    .eq("business_id", businessId)
    .single();

  if (!conv) {
    throw new Error("Conversation not found or access denied");
  }

  const { error } = await admin
    .from("conversations")
    .delete()
    .eq("id", conversation_id);

  if (error) throw error;

  return { conversation_id, deleted: true };
}
