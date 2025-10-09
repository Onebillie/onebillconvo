import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header required");
    }
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !userData.user?.email) {
      throw new Error("User not authenticated");
    }

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe configuration error");
    }
    
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Find customer by email
    const customers = await stripe.customers.list({ 
      email: userData.user.email, 
      limit: 1 
    });
    
    if (customers.data.length === 0) {
      return new Response(
        JSON.stringify({ hasOutstanding: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const customerId = customers.data[0].id;
    
    // Get open/past_due invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      status: 'open',
      limit: 10,
    });

    const pastDueInvoices = await stripe.invoices.list({
      customer: customerId,
      status: 'past_due',
      limit: 10,
    });

    const allOutstanding = [...invoices.data, ...pastDueInvoices.data];
    
    if (allOutstanding.length === 0) {
      return new Response(
        JSON.stringify({ hasOutstanding: false }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get the most urgent invoice
    const mostUrgent = allOutstanding.sort((a, b) => 
      (a.due_date || 0) - (b.due_date || 0)
    )[0];

    return new Response(
      JSON.stringify({
        hasOutstanding: true,
        amountDue: mostUrgent.amount_due,
        currency: mostUrgent.currency,
        dueDate: mostUrgent.due_date ? new Date(mostUrgent.due_date * 1000).toISOString() : null,
        invoiceUrl: mostUrgent.hosted_invoice_url,
        invoicePdf: mostUrgent.invoice_pdf,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error getting outstanding invoice:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
