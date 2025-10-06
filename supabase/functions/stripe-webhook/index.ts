import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[STRIPE-WEBHOOK] ${step}`, details ? JSON.stringify(details) : '');
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
    apiVersion: "2025-08-27.basil",
  });

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const body = await req.text();
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    const event = webhookSecret
      ? stripe.webhooks.constructEvent(body, signature, webhookSecret)
      : JSON.parse(body);

    logStep("Webhook event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        
        logStep("Processing subscription update", { 
          subscriptionId: subscription.id, 
          status: subscription.status,
          customerId 
        });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (!email) {
          logStep("No email found for customer");
          break;
        }

        // Find user by email
        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === email);

        if (!user) {
          logStep("No user found for email", { email });
          break;
        }

        // Get business for user
        const { data: businessUser } = await supabaseClient
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.id)
          .single();

        if (!businessUser) {
          logStep("No business found for user");
          break;
        }

        // Determine tier from product
        const productId = subscription.items.data[0].price.product as string;
        const quantity = subscription.items.data[0].quantity || 1;

        // Update business with subscription info
        const { error: updateError } = await supabaseClient
          .from("businesses")
          .update({
            stripe_customer_id: customerId,
            stripe_subscription_id: subscription.id,
            subscription_status: subscription.status,
            subscription_started_at: new Date(subscription.created * 1000).toISOString(),
            subscription_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
            is_frozen: false,
            seat_count: quantity,
          })
          .eq("id", businessUser.business_id);

        if (updateError) {
          logStep("Error updating business", { error: updateError });
        } else {
          logStep("Business updated successfully");
        }

        // Insert history record
        await supabaseClient.from("subscription_history").insert({
          business_id: businessUser.business_id,
          event_type: event.type,
          stripe_event_id: event.id,
          metadata: {
            subscription_id: subscription.id,
            status: subscription.status,
            quantity: quantity,
          },
        });

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;

        logStep("Processing subscription cancellation", { subscriptionId: subscription.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;

        if (!email) break;

        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === email);
        if (!user) break;

        const { data: businessUser } = await supabaseClient
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.id)
          .single();

        if (!businessUser) break;

        await supabaseClient
          .from("businesses")
          .update({
            subscription_status: "canceled",
            subscription_ends_at: new Date().toISOString(),
            is_frozen: true,
          })
          .eq("id", businessUser.business_id);

        await supabaseClient.from("subscription_history").insert({
          business_id: businessUser.business_id,
          event_type: event.type,
          stripe_event_id: event.id,
        });

        logStep("Subscription cancelled and account frozen");
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        logStep("Payment succeeded", { invoiceId: invoice.id });

        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (!email) break;

        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === email);
        if (!user) break;

        const { data: businessUser } = await supabaseClient
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.id)
          .single();

        if (!businessUser) break;

        await supabaseClient
          .from("businesses")
          .update({
            subscription_status: "active",
            is_frozen: false,
          })
          .eq("id", businessUser.business_id);

        logStep("Account unfrozen after successful payment");
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;

        logStep("Payment failed", { invoiceId: invoice.id });

        const customer = await stripe.customers.retrieve(customerId);
        const email = (customer as Stripe.Customer).email;
        if (!email) break;

        const { data: userData } = await supabaseClient.auth.admin.listUsers();
        const user = userData.users.find(u => u.email === email);
        if (!user) break;

        const { data: businessUser } = await supabaseClient
          .from("business_users")
          .select("business_id")
          .eq("user_id", user.id)
          .single();

        if (!businessUser) break;

        await supabaseClient
          .from("businesses")
          .update({
            subscription_status: "past_due",
            is_frozen: true,
          })
          .eq("id", businessUser.business_id);

        // Send notification email
        await supabaseClient.functions.invoke("send-payment-notification", {
          body: {
            email: email,
            type: "payment_failed",
            customerPortalUrl: invoice.hosted_invoice_url,
          },
        });

        logStep("Account frozen due to payment failure, notification sent");
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
