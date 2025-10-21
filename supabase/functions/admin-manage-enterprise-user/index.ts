import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the request is from a superadmin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user is superadmin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roles || roles.role !== "superadmin") {
      return new Response(JSON.stringify({ error: "Not authorized - superadmin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { userId, full_name, email, role, newPassword } = await req.json();

    if (!userId) {
      return new Response(JSON.stringify({ error: "userId is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .update({ full_name, email })
      .eq("id", userId);

    if (profileError) {
      console.error("Profile update error:", profileError);
      return new Response(JSON.stringify({ error: "Failed to update profile", details: profileError }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update auth email if changed
    const { data: currentUser } = await supabaseClient.auth.admin.getUserById(userId);
    if (currentUser?.user && currentUser.user.email !== email) {
      await supabaseClient.auth.admin.updateUserById(userId, { email });
    }

    // Update role
    if (role) {
      // Delete existing roles
      await supabaseClient
        .from("user_roles")
        .delete()
        .eq("user_id", userId);

      // Insert new role
      const { error: roleError } = await supabaseClient
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (roleError) {
        console.error("Role update error:", roleError);
        return new Response(JSON.stringify({ error: "Failed to update role", details: roleError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Update password if provided
    if (newPassword) {
      const { error: passwordError } = await supabaseClient.auth.admin.updateUserById(
        userId,
        { password: newPassword }
      );

      if (passwordError) {
        console.error("Password update error:", passwordError);
        return new Response(JSON.stringify({ error: "Failed to update password", details: passwordError }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "User updated successfully" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in admin-manage-enterprise-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});