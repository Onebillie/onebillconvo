import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";

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
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const { businessId } = await req.json();

    if (!businessId) {
      throw new Error("Business ID is required");
    }

    // Get business details
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("*, profiles!inner(*)")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found");
    }

    // Check auto topup settings
    const { data: autoTopupSettings, error: settingsError } = await supabaseClient
      .from("auto_topup_settings")
      .select("*")
      .eq("business_id", businessId)
      .eq("enabled", true)
      .single();

    if (settingsError || !autoTopupSettings) {
      return new Response(
        JSON.stringify({ message: "Auto topup not enabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Check if credit balance is below threshold
    const currentCredits = business.credit_balance || 0;
    
    if (currentCredits >= autoTopupSettings.threshold_credits) {
      return new Response(
        JSON.stringify({ message: "Credit balance above threshold" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Determine bundle price ID based on bundle size
    const bundlePriceIds: Record<string, string> = {
      small: Deno.env.get("STRIPE_CREDIT_BUNDLE_SMALL_PRICE_ID") || "",
      medium: Deno.env.get("STRIPE_CREDIT_BUNDLE_MEDIUM_PRICE_ID") || "",
      large: Deno.env.get("STRIPE_CREDIT_BUNDLE_LARGE_PRICE_ID") || "",
    };

    const priceId = bundlePriceIds[autoTopupSettings.bundle_size];
    if (!priceId) {
      throw new Error(`Invalid bundle size: ${autoTopupSettings.bundle_size}`);
    }

    // Get customer's Stripe ID
    if (!business.stripe_customer_id) {
      throw new Error("No Stripe customer ID found for business");
    }

    // Get default payment method
    const customer = await stripe.customers.retrieve(business.stripe_customer_id);
    if (!customer || customer.deleted) {
      throw new Error("Stripe customer not found");
    }

    const defaultPaymentMethod = (customer as any).invoice_settings?.default_payment_method;
    if (!defaultPaymentMethod) {
      // Send email notification that auto topup failed due to no payment method
      await supabaseClient.functions.invoke("send-transactional-email", {
        body: {
          to: business.profiles.email,
          subject: "Auto Top-Up Failed - Payment Method Required",
          html: `
            <h2>Auto Top-Up Failed</h2>
            <p>We attempted to automatically top up your message credits, but no payment method is on file.</p>
            <p>Current balance: ${currentCredits} credits</p>
            <p>Threshold: ${autoTopupSettings.threshold_credits} credits</p>
            <p>Please add a payment method in your billing settings to enable auto top-up.</p>
          `,
        },
      });

      return new Response(
        JSON.stringify({ error: "No default payment method" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create payment intent for auto topup
    const paymentIntent = await stripe.paymentIntents.create({
      amount: autoTopupSettings.bundle_size === "small" ? 1000 : 
              autoTopupSettings.bundle_size === "medium" ? 2500 : 7500,
      currency: "usd",
      customer: business.stripe_customer_id,
      payment_method: defaultPaymentMethod,
      off_session: true,
      confirm: true,
      metadata: {
        business_id: businessId,
        type: "credit_bundle_auto",
        bundle_size: autoTopupSettings.bundle_size,
      },
    });

    if (paymentIntent.status === "succeeded") {
      // Update last topup timestamp
      await supabaseClient
        .from("auto_topup_settings")
        .update({ last_topup_at: new Date().toISOString() })
        .eq("business_id", businessId);

      // Credits will be added via Stripe webhook
      
      // Send success email
      await supabaseClient.functions.invoke("send-transactional-email", {
        body: {
          to: business.profiles.email,
          subject: "Auto Top-Up Successful",
          html: `
            <h2>Credits Automatically Added</h2>
            <p>Your account was automatically topped up with ${
              autoTopupSettings.bundle_size === "small" ? "500" :
              autoTopupSettings.bundle_size === "medium" ? "1,500" : "5,000"
            } message credits.</p>
            <p>Previous balance: ${currentCredits} credits</p>
            <p>Bundle purchased: ${autoTopupSettings.bundle_size.toUpperCase()}</p>
            <p>Amount charged: $${paymentIntent.amount / 100}</p>
          `,
        },
      });

      return new Response(
        JSON.stringify({ success: true, paymentIntent }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    } else {
      throw new Error(`Payment failed with status: ${paymentIntent.status}`);
    }

  } catch (error: any) {
    console.error("Error in check-auto-topup:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
