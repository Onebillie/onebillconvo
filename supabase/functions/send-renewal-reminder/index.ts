import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import Stripe from "https://esm.sh/stripe@18.5.0";

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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Get businesses with subscriptions expiring in 7 days
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const sevenDaysFromNowStr = sevenDaysFromNow.toISOString().split('T')[0];

    const eightDaysFromNow = new Date();
    eightDaysFromNow.setDate(eightDaysFromNow.getDate() + 8);
    const eightDaysFromNowStr = eightDaysFromNow.toISOString().split('T')[0];

    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        name,
        email,
        stripe_customer_id,
        subscription_end_date,
        subscription_tier,
        business_users!inner (
          users!inner (
            email
          )
        )
      `)
      .eq('subscription_status', 'active')
      .gte('subscription_end_date', sevenDaysFromNowStr)
      .lt('subscription_end_date', eightDaysFromNowStr);

    if (!businesses || businesses.length === 0) {
      return new Response(
        JSON.stringify({ message: "No subscriptions expiring soon" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    for (const business of businesses) {
      if (!business.stripe_customer_id) continue;

      // Get subscription details from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: business.stripe_customer_id,
        status: 'active',
        limit: 1,
      });

      if (subscriptions.data.length === 0) continue;

      const subscription = subscriptions.data[0];
      const renewalDate = new Date(subscription.current_period_end * 1000);
      const amount = subscription.items.data[0]?.price.unit_amount || 0;
      const currency = subscription.items.data[0]?.price.currency || 'usd';

      const adminEmail = business.business_users[0]?.users?.email || business.email;

      if (adminEmail) {
        await supabaseAdmin.functions.invoke('send-transactional-email', {
          body: {
            to: adminEmail,
            subject: `Your ${business.subscription_tier} subscription renews in 7 days`,
            html: `
              <h2>Subscription Renewal Reminder</h2>
              
              <p>Hi ${business.name} team,</p>
              
              <p>This is a friendly reminder that your <strong>${business.subscription_tier}</strong> subscription will automatically renew in 7 days.</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Renewal Details</h3>
                <ul>
                  <li><strong>Plan:</strong> ${business.subscription_tier}</li>
                  <li><strong>Renewal Date:</strong> ${renewalDate.toLocaleDateString()}</li>
                  <li><strong>Amount:</strong> ${(amount / 100).toFixed(2)} ${currency.toUpperCase()}</li>
                </ul>
              </div>
              
              <p>Your subscription will automatically renew unless you cancel before the renewal date.</p>
              
              <p>Need to make changes? You can manage your subscription anytime:</p>
              
              <p style="margin: 30px 0;">
                <a href="${Deno.env.get('APP_URL')}/app/settings?tab=subscription" 
                   style="background: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                  Manage Subscription
                </a>
              </p>
              
              <p>Thank you for being a valued customer!</p>
              
              <p>Best regards,<br>À La Carte Chat Team</p>
            `,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${businesses.length} renewal reminders` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error sending renewal reminders:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
