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
    const apiKey = req.headers.get("x-api-key");
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

    const { operation, data } = await req.json();

    if (!operation) {
      return new Response(JSON.stringify({ error: "missing_operation" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // Validate API key and get business + customer scope + permission level
    const { data: keyRow, error: keyErr } = await admin
      .from("api_keys")
      .select("business_id, customer_id, permission_level, is_active, expires_at")
      .eq("key_hash", apiKey)
      .single();

    if (keyErr || !keyRow || !keyRow.is_active || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
      return new Response(JSON.stringify({ error: "invalid_api_key" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const businessId = keyRow.business_id;
    const customerScope = keyRow.customer_id;
    const permissionLevel = keyRow.permission_level;

    console.log(`Embed operation: ${operation} for business ${businessId}${customerScope ? ` (customer-scoped: ${customerScope})` : ''} with ${permissionLevel} permission`);

    // Permission checks
    const writeOps = ['send_message', 'update_status', 'assign_conversation', 'create_task'];
    const adminOps = ['delete_conversation', 'toggle_ai', 'sync_emails'];
    
    if (writeOps.includes(operation) && permissionLevel === 'read_only') {
      return new Response(JSON.stringify({ error: "permission_denied_read_only" }), { status: 403, headers: corsHeaders });
    }
    
    if (adminOps.includes(operation) && permissionLevel !== 'admin') {
      return new Response(JSON.stringify({ error: "permission_denied_requires_admin" }), { status: 403, headers: corsHeaders });
    }

    // Handle different operations
    let result;
    
    switch (operation) {
      case 'send_message':
        result = await handleSendMessage(admin, businessId, customerScope, data);
        break;
      
      case 'update_status':
        result = await handleUpdateStatus(admin, businessId, customerScope, data);
        break;
      
      case 'assign_conversation':
        result = await handleAssignConversation(admin, businessId, customerScope, data);
        break;
      
      case 'create_task':
        result = await handleCreateTask(admin, businessId, customerScope, data);
        break;
      
      case 'delete_conversation':
        result = await handleDeleteConversation(admin, businessId, customerScope, data);
        break;
      
      case 'toggle_ai':
        result = await handleToggleAI(admin, businessId, data);
        break;
      
      case 'sync_emails':
        result = await handleSyncEmails(admin, businessId);
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

async function handleSendMessage(admin: any, businessId: string, customerScope: string | null, data: any) {
  const { conversation_id, content, attachments } = data;

  // Verify conversation belongs to business AND customer scope
  let convQuery = admin
    .from("conversations")
    .select("id, customer_id")
    .eq("id", conversation_id)
    .eq("business_id", businessId);
  
  if (customerScope) {
    convQuery = convQuery.eq("customer_id", customerScope);
  }
  
  const { data: conv } = await convQuery.single();

  if (!conv) {
    console.error("E_EMBED_SCOPE_VIOLATION: send_message denied", { conversation_id, customerScope });
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

async function handleUpdateStatus(admin: any, businessId: string, customerScope: string | null, data: any) {
  const { conversation_id, status_tag_id } = data;

  // Verify conversation belongs to business AND customer scope
  let convQuery = admin
    .from("conversations")
    .select("id, customer_id")
    .eq("id", conversation_id)
    .eq("business_id", businessId);
  
  if (customerScope) {
    convQuery = convQuery.eq("customer_id", customerScope);
  }
  
  const { data: conv } = await convQuery.single();

  if (!conv) {
    console.error("E_EMBED_SCOPE_VIOLATION: update_status denied", { conversation_id, customerScope });
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

async function handleAssignConversation(admin: any, businessId: string, customerScope: string | null, data: any) {
  const { conversation_id, user_id } = data;

  // Verify conversation belongs to business AND customer scope
  let convQuery = admin
    .from("conversations")
    .select("id, customer_id")
    .eq("id", conversation_id)
    .eq("business_id", businessId);
  
  if (customerScope) {
    convQuery = convQuery.eq("customer_id", customerScope);
  }
  
  const { data: conv } = await convQuery.single();

  if (!conv) {
    console.error("E_EMBED_SCOPE_VIOLATION: assign_conversation denied", { conversation_id, customerScope });
    throw new Error("Conversation not found or access denied");
  }

  const { error } = await admin
    .from("conversations")
    .update({ assigned_to: user_id })
    .eq("id", conversation_id);

  if (error) throw error;

  return { conversation_id, assigned_to: user_id };
}

async function handleCreateTask(admin: any, businessId: string, customerScope: string | null, data: any) {
  const { conversation_id, customer_id, title, description, priority, due_date, assigned_to } = data;

  // Verify conversation belongs to business AND customer scope
  let convQuery = admin
    .from("conversations")
    .select("id, customer_id")
    .eq("id", conversation_id)
    .eq("business_id", businessId);
  
  if (customerScope) {
    convQuery = convQuery.eq("customer_id", customerScope);
  }
  
  const { data: conv } = await convQuery.single();

  if (!conv) {
    console.error("E_EMBED_SCOPE_VIOLATION: create_task denied", { conversation_id, customerScope });
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

async function handleDeleteConversation(admin: any, businessId: string, customerScope: string | null, data: any) {
  const { conversation_id } = data;

  // Verify conversation belongs to business AND customer scope
  let convQuery = admin
    .from("conversations")
    .select("id, customer_id")
    .eq("id", conversation_id)
    .eq("business_id", businessId);
  
  if (customerScope) {
    convQuery = convQuery.eq("customer_id", customerScope);
  }
  
  const { data: conv } = await convQuery.single();

  if (!conv) {
    console.error("E_EMBED_SCOPE_VIOLATION: delete_conversation denied", { conversation_id, customerScope });
    throw new Error("Conversation not found or access denied");
  }

  const { error } = await admin
    .from("conversations")
    .delete()
    .eq("id", conversation_id);

  if (error) throw error;

  return { conversation_id, deleted: true };
}

async function handleToggleAI(admin: any, businessId: string, data: any) {
  const { enabled } = data;
  
  const { error } = await admin
    .from("business_settings")
    .upsert({
      business_id: businessId,
      ai_enabled: enabled,
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "business_id",
    });
  
  if (error) throw error;
  
  console.log(`Toggled AI to ${enabled} for business ${businessId}`);
  return { success: true, ai_enabled: enabled };
}

async function handleSyncEmails(admin: any, businessId: string) {
  // Get all active email accounts for this business
  const { data: accounts, error: accountsError } = await admin
    .from("email_accounts")
    .select("id")
    .eq("business_id", businessId)
    .eq("is_active", true);
  
  if (accountsError) throw accountsError;
  
  if (!accounts || accounts.length === 0) {
    return { success: true, message: "No active email accounts to sync", accounts_synced: 0 };
  }
  
  // Trigger sync for each account (fire and forget)
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  
  for (const account of accounts) {
    fetch(`${supabaseUrl}/functions/v1/email-sync`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ account_id: account.id }),
    }).catch(err => console.error(`Failed to trigger sync for account ${account.id}:`, err));
  }
  
  console.log(`Triggered email sync for ${accounts.length} accounts in business ${businessId}`);
  return { success: true, accounts_synced: accounts.length };
}
