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

    // Verify user is authenticated and is superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is superadmin
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Superadmin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { business_id, confirm } = await req.json();

    if (!business_id) {
      return new Response(JSON.stringify({ error: "business_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get business details
    const { data: business } = await supabase
      .from("businesses")
      .select("*")
      .eq("id", business_id)
      .single();

    if (!business) {
      return new Response(JSON.stringify({ error: "Business not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Count related records
    const counts = {
      customers: 0,
      conversations: 0,
      messages: 0,
      whatsapp_accounts: 0,
      email_accounts: 0,
      training_conversations: 0,
      business_users: 0,
      ai_knowledge_documents: 0,
      voice_call_usage: 0,
      call_records: 0,
    };

    const { count: customerCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.customers = customerCount || 0;

    const { count: conversationCount } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.conversations = conversationCount || 0;

    const { count: messageCount } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.messages = messageCount || 0;

    const { count: whatsappCount } = await supabase
      .from("whatsapp_accounts")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.whatsapp_accounts = whatsappCount || 0;

    const { count: emailCount } = await supabase
      .from("email_accounts")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.email_accounts = emailCount || 0;

    const { count: trainingCount } = await supabase
      .from("training_conversations")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.training_conversations = trainingCount || 0;

    const { count: userCount } = await supabase
      .from("business_users")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.business_users = userCount || 0;

    const { count: aiDocCount } = await supabase
      .from("ai_knowledge_documents")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.ai_knowledge_documents = aiDocCount || 0;

    const { count: voiceUsageCount } = await supabase
      .from("voice_call_usage")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.voice_call_usage = voiceUsageCount || 0;

    const { count: callRecordCount } = await supabase
      .from("call_records")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id);
    counts.call_records = callRecordCount || 0;

    // If confirm is not true, return summary
    if (!confirm) {
      return new Response(
        JSON.stringify({
          action: "preview",
          business,
          counts,
          warning: "Set confirm: true to proceed with deletion. This action cannot be undone!",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Proceed with deletion in correct order
    console.log(`Starting deletion of business: ${business.name} (${business_id})`);

    // 1. Delete messages (must be before conversations)
    await supabase.from("messages").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.messages} messages`);

    // 2. Delete conversations (must be before customers)
    await supabase.from("conversations").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.conversations} conversations`);

    // 3. Delete customers
    await supabase.from("customers").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.customers} customers`);

    // 4. Delete training conversations
    await supabase.from("training_conversations").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.training_conversations} training conversations`);

    // 5. Delete WhatsApp accounts
    await supabase.from("whatsapp_accounts").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.whatsapp_accounts} WhatsApp accounts`);

    // 6. Delete email accounts
    await supabase.from("email_accounts").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.email_accounts} email accounts`);

    // 7. Delete AI knowledge documents
    await supabase.from("ai_knowledge_documents").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.ai_knowledge_documents} AI documents`);

    // 8. Delete voice usage
    await supabase.from("voice_call_usage").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.voice_call_usage} voice usage records`);

    // 9. Delete call records
    await supabase.from("call_records").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.call_records} call records`);

    // 10. Delete business users
    await supabase.from("business_users").delete().eq("business_id", business_id);
    console.log(`Deleted ${counts.business_users} business users`);

    // 11. Finally delete the business
    await supabase.from("businesses").delete().eq("id", business_id);
    console.log(`Deleted business: ${business.name}`);

    // 12. Log the deletion
    await supabase.from("business_audit_log").insert({
      business_id: null,
      action: "business_deleted",
      changed_by: user.id,
      changes: {
        business_name: business.name,
        business_id: business_id,
        deleted_at: new Date().toISOString(),
        deleted_by: user.email,
        counts,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Business "${business.name}" and all related data deleted successfully`,
        counts,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error in admin-delete-business:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
