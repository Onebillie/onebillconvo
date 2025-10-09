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

    console.log(`Processing superadmin account: ${email}`);

    // Check if user already exists
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("email", email)
      .single();

    let userId: string;
    let status: "created" | "updated";

    if (existingProfile) {
      // User exists - update password if provided
      userId = existingProfile.id;
      console.log(`User already exists: ${userId}`);

      if (password) {
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password, email_confirm: true }
        );

        if (updateError) {
          console.error("Error updating password:", updateError);
          throw new Error(`Failed to update password: ${updateError.message}`);
        }

        console.log("Password updated successfully");
        status = "updated";
      } else {
        throw new Error("Password is required to update existing account");
      }
    } else {
      // User doesn't exist - create new account
      console.log(`Creating new superadmin account: ${email}`);

      if (!password) {
        throw new Error("Password is required to create new account");
      }

      const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: "SuperAdmin"
        }
      });

      if (createError) {
        console.error("Error creating user:", createError);
        throw createError;
      }

      userId = user.user.id;
      console.log(`User created: ${userId}`);

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          id: userId,
          full_name: "SuperAdmin",
          email: email
        });

      if (profileError) {
        console.error("Error creating profile:", profileError);
        // Don't throw - might be a race condition
      }

      status = "created";
    }

    // Ensure superadmin role exists
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .upsert({
        user_id: userId,
        role: "superadmin"
      }, {
        onConflict: "user_id,role"
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      throw new Error(`Failed to assign superadmin role: ${roleError.message}`);
    }

    console.log(`Superadmin role ensured for ${email}`);

    return new Response(
      JSON.stringify({ 
        success: true,
        status,
        user: {
          id: userId,
          email: email
        },
        message: status === "created" 
          ? "Superadmin account created. You can now log in with your password."
          : "Password updated. You can now log in with your new password."
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
