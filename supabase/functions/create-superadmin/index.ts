import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const { email, password } = await req.json();

    if (!email) {
      throw new Error("Email is required");
    }

    console.log(`Creating superadmin account: ${email}`);

    // Create the user with admin API
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: password || undefined, // If no password, user will need to reset
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: "SuperAdmin"
      }
    });

    if (createError) {
      console.error("Error creating user:", createError);
      throw createError;
    }

    console.log(`User created: ${user.user.id}`);

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        id: user.user.id,
        full_name: "SuperAdmin",
        email: email
      });

    if (profileError) {
      console.error("Error creating profile:", profileError);
      // Don't throw - profile might already exist
    }

    // Assign superadmin role
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: user.user.id,
        role: "superadmin"
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      throw new Error(`Failed to assign superadmin role: ${roleError.message}`);
    }

    console.log(`Superadmin role assigned to ${email}`);

    // Send password reset email if no password was provided
    let resetSent = false;
    if (!password) {
      const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'recovery',
        email: email,
        options: {
          redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}.supabase.co/admin/login`
        }
      });

      if (resetError) {
        console.error("Error generating reset link:", resetError);
      } else {
        resetSent = true;
        console.log("Password reset email sent");
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        user: {
          id: user.user.id,
          email: user.user.email
        },
        message: resetSent 
          ? "Superadmin created. Password reset email sent."
          : "Superadmin created. Please check your email."
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("Error in create-superadmin function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
