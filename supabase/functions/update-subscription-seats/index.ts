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

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("User not authenticated");

    const { businessId, newSeatCount } = await req.json();

    if (!businessId || !newSeatCount) {
      throw new Error("Business ID and seat count are required");
    }

    // Get business details
    const { data: business, error: businessError } = await supabaseClient
      .from("businesses")
      .select("stripe_subscription_id, seat_count")
      .eq("id", businessId)
      .single();

    if (businessError || !business) {
      throw new Error("Business not found");
    }

    if (!business.stripe_subscription_id) {
      throw new Error("No active subscription found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get subscription
    const subscription = await stripe.subscriptions.retrieve(business.stripe_subscription_id);
    const subscriptionItemId = subscription.items.data[0].id;

    // Update subscription quantity (Stripe will prorate automatically)
    const updatedSubscription = await stripe.subscriptions.update(business.stripe_subscription_id, {
      items: [{
        id: subscriptionItemId,
        quantity: newSeatCount,
      }],
      proration_behavior: "always_invoice",
    });

    // Update business seat count
    await supabaseClient
      .from("businesses")
      .update({ seat_count: newSeatCount })
      .eq("id", businessId);

    // Calculate proration amount
    const latestInvoice = await stripe.invoices.retrieve(updatedSubscription.latest_invoice as string);
    const prorationAmount = latestInvoice.amount_due / 100; // Convert from cents to dollars

    console.log("Subscription updated:", {
      subscriptionId: business.stripe_subscription_id,
      oldSeats: business.seat_count,
      newSeats: newSeatCount,
      prorationAmount,
    });

    return new Response(JSON.stringify({
      success: true,
      newSeatCount,
      prorationAmount,
      message: newSeatCount > business.seat_count
        ? `Added ${newSeatCount - business.seat_count} seat(s). You'll be charged $${prorationAmount.toFixed(2)} immediately.`
        : `Removed ${business.seat_count - newSeatCount} seat(s). You'll receive a $${Math.abs(prorationAmount).toFixed(2)} credit.`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error updating subscription seats:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
