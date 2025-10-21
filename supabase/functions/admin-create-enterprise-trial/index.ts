import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-CREATE-ENTERPRISE-TRIAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Verify admin authorization
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");
    
    // Check if user is superadmin
    const { data: roleData } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "superadmin")
      .single();
    
    if (!roleData) {
      throw new Error("Unauthorized: Superadmin access required");
    }
    
    logStep("Admin authorized", { adminId: user.id });

    // Parse request body
    const body = await req.json();
    const {
      businessName,
      ownerEmail,
      ownerFullName,
      trialDays = 30,
      customPrice,
      paymentMethod = "bank",
      invoiceEmail,
      customFeatures = {},
      notes,
      tempPassword,
      assignRole = "admin"
    } = body;

    if (!businessName || !ownerEmail || !ownerFullName) {
      throw new Error("Missing required fields: businessName, ownerEmail, ownerFullName");
    }

    logStep("Creating enterprise trial account", { businessName, ownerEmail, paymentMethod, assignRole });

    // Check if user already exists
    let ownerId: string;
    let isNewUser = false;
    const { data: existingUser } = await supabaseClient.auth.admin.listUsers();
    const userExists = existingUser?.users?.find(u => u.email === ownerEmail);

    if (userExists) {
      ownerId = userExists.id;
      logStep("Using existing user", { ownerId });
      
      // Update password if provided
      if (tempPassword) {
        await supabaseClient.auth.admin.updateUserById(ownerId, {
          password: tempPassword
        });
        logStep("Updated user password");
      }
    } else {
      // Create new user account with temp password
      const password = tempPassword || `Temp${Math.random().toString(36).slice(-8)}!`;
      
      const { data: newUser, error: createUserError } = await supabaseClient.auth.admin.createUser({
        email: ownerEmail,
        password: password,
        email_confirm: true,
        user_metadata: {
          full_name: ownerFullName,
          is_enterprise: true
        }
      });

      if (createUserError) throw new Error(`Error creating user: ${createUserError.message}`);
      if (!newUser.user) throw new Error("User creation failed");
      
      ownerId = newUser.user.id;
      isNewUser = true;
      logStep("Created new user", { ownerId, hasPassword: !!tempPassword });

      // Update profile
      await supabaseClient
        .from("profiles")
        .update({ full_name: ownerFullName })
        .eq("id", ownerId);
    }

    // Assign role to user
    await supabaseClient
      .from("user_roles")
      .upsert({
        user_id: ownerId,
        role: assignRole
      }, {
        onConflict: "user_id,role"
      });
    
    logStep("Assigned role", { role: assignRole });

    // Calculate trial end date
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Create business with enterprise settings
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .insert({
        name: businessName,
        slug: `enterprise-${businessName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
        owner_id: ownerId,
        subscription_tier: "enterprise",
        subscription_status: "trialing",
        trial_ends_at: trialEndsAt.toISOString(),
        is_enterprise: true,
        payment_method: paymentMethod,
        custom_price_monthly: customPrice || null,
        invoice_email: invoiceEmail || ownerEmail,
        payment_status: "pending",
        enterprise_notes: notes || null,
        custom_features: customFeatures,
        is_unlimited: true,
        seat_count: 999,
        is_frozen: false
      })
      .select()
      .single();

    if (businessError) throw new Error(`Error creating business: ${businessError.message}`);
    
    logStep("Business created", { businessId: business.id });

    // Add user as business owner
    await supabaseClient
      .from("business_users")
      .insert({
        business_id: business.id,
        user_id: ownerId,
        role: "owner"
      });

    // If custom price is set, create first invoice
    if (customPrice && customPrice > 0) {
      const nextPaymentDue = new Date(trialEndsAt);
      nextPaymentDue.setDate(nextPaymentDue.getDate() + 1);

      await supabaseClient
        .from("enterprise_invoices")
        .insert({
          business_id: business.id,
          invoice_number: `ENT-${Date.now()}`,
          amount: customPrice,
          currency: "usd",
          status: "pending",
          payment_method: paymentMethod,
          due_date: nextPaymentDue.toISOString(),
          notes: `First payment for ${businessName}`
        });

      await supabaseClient
        .from("businesses")
        .update({ next_payment_due: nextPaymentDue.toISOString() })
        .eq("id", business.id);

      logStep("Invoice created", { amount: customPrice });
    }

    logStep("Enterprise trial account created successfully");

    return new Response(
      JSON.stringify({
        success: true,
        businessId: business.id,
        ownerId: ownerId,
        trialEndsAt: trialEndsAt.toISOString(),
        message: "Enterprise trial account created successfully"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});