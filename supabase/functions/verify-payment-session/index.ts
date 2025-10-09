import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const { session_id } = await req.json();
    
    if (!session_id) {
      throw new Error("Session ID is required");
    }

    logStep("Session ID received", { session_id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe configuration error");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    
    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    logStep("Checkout session retrieved", { 
      payment_status: session.payment_status,
      status: session.status,
      subscription: session.subscription 
    });

    // Get subscription details if exists
    let subscriptionActive = false;
    let tier = 'free';
    
    if (session.subscription && typeof session.subscription === 'string') {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      subscriptionActive = subscription.status === 'active';
      
      // Get product ID from subscription
      if (subscription.items.data.length > 0) {
        const productId = subscription.items.data[0].price.product;
        logStep("Product ID from subscription", { productId });
        
        // Map product ID to tier (you should adjust these based on your actual product IDs)
        const productTierMap: Record<string, string> = {
          'prod_TCk9FVGSQYsfdV': 'starter',
          'prod_TCkEnLBpXd1ttM': 'professional',
          'prod_TCkEtHuWycEz84': 'enterprise',
        };
        
        tier = productTierMap[productId as string] || 'free';
      }
      
      logStep("Subscription status", { subscriptionActive, tier });
    }

    // Verify with Supabase database
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabaseClient.auth.getUser(token);
      
      if (userData.user) {
        // Get user's business
        const { data: businessUsers } = await supabaseClient
          .from("business_users")
          .select("business_id")
          .eq("user_id", userData.user.id)
          .limit(1);
          
        if (businessUsers && businessUsers.length > 0) {
          const { data: business } = await supabaseClient
            .from("businesses")
            .select("subscription_status, subscription_tier")
            .eq("id", businessUsers[0].business_id)
            .single();
            
          logStep("Database verification", {
            db_status: business?.subscription_status,
            db_tier: business?.subscription_tier
          });
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: session.payment_status === 'paid',
        status: session.payment_status,
        subscriptionActive,
        tier,
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
