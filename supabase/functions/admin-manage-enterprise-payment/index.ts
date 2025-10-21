import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ADMIN-MANAGE-ENTERPRISE-PAYMENT] ${step}${detailsStr}`);
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
    const { businessId, action, invoiceId, notes } = body;

    if (!businessId || !action) {
      throw new Error("Missing required fields: businessId, action");
    }

    logStep("Processing action", { businessId, action });

    // Get business
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found");
    }

    let result: any = {};

    switch (action) {
      case "mark_paid":
        // Mark business as paid and unfreeze
        const { error: updateError } = await supabaseClient
          .from("businesses")
          .update({
            payment_status: "paid",
            last_payment_date: new Date().toISOString(),
            is_frozen: false,
            subscription_status: "active"
          })
          .eq("id", businessId);

        if (updateError) throw new Error(`Error updating business: ${updateError.message}`);

        // If invoice ID provided, mark invoice as paid
        if (invoiceId) {
          await supabaseClient
            .from("enterprise_invoices")
            .update({
              status: "paid",
              paid_date: new Date().toISOString()
            })
            .eq("id", invoiceId);
        }

        // Calculate next payment due (30 days from now)
        const nextDue = new Date();
        nextDue.setDate(nextDue.getDate() + 30);
        
        await supabaseClient
          .from("businesses")
          .update({ next_payment_due: nextDue.toISOString() })
          .eq("id", businessId);

        logStep("Account marked as paid and unfrozen");
        result = { message: "Account marked as paid and unfrozen", nextPaymentDue: nextDue.toISOString() };
        break;

      case "freeze":
        // Freeze account for non-payment
        await supabaseClient
          .from("businesses")
          .update({
            is_frozen: true,
            payment_status: "overdue"
          })
          .eq("id", businessId);

        logStep("Account frozen");
        result = { message: "Account frozen due to non-payment" };
        break;

      case "unfreeze":
        // Manually unfreeze account
        await supabaseClient
          .from("businesses")
          .update({
            is_frozen: false
          })
          .eq("id", businessId);

        logStep("Account unfrozen");
        result = { message: "Account unfrozen" };
        break;

      case "create_invoice":
        // Create new invoice
        const { amount, dueDate } = body;
        if (!amount || !dueDate) {
          throw new Error("Missing amount or dueDate for invoice creation");
        }

        const { data: invoice, error: invoiceError } = await supabaseClient
          .from("enterprise_invoices")
          .insert({
            business_id: businessId,
            invoice_number: `ENT-${Date.now()}`,
            amount: amount,
            currency: "usd",
            status: "pending",
            payment_method: business.payment_method,
            due_date: dueDate,
            notes: notes || null
          })
          .select()
          .single();

        if (invoiceError) throw new Error(`Error creating invoice: ${invoiceError.message}`);

        logStep("Invoice created", { invoiceId: invoice.id });
        result = { message: "Invoice created", invoice };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(
      JSON.stringify({ success: true, ...result }),
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