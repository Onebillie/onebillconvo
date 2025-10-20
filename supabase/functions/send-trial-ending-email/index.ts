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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    console.log("=== TRIAL ENDING EMAIL CHECK ===");

    // Find businesses with trials ending in 7, 3, or 1 day
    const now = new Date();
    const sevenDays = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const threeDays = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000);

    const { data: businesses, error: businessError } = await supabase
      .from("businesses")
      .select("id, name, stripe_customer_id, subscription_end, subscription_status")
      .eq("subscription_status", "trialing")
      .not("stripe_customer_id", "is", null);

    if (businessError) throw businessError;

    console.log(`Found ${businesses?.length || 0} businesses with trials`);

    for (const business of businesses || []) {
      if (!business.stripe_customer_id || !business.subscription_end) continue;

      const trialEnd = new Date(business.subscription_end);
      const daysRemaining = Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      // Only send at exactly 7, 3, or 1 day marks
      if (![7, 3, 1].includes(daysRemaining)) continue;

      console.log(`Trial ending in ${daysRemaining} days for business: ${business.name}`);

      // Get subscription details from Stripe
      const subscriptions = await stripe.subscriptions.list({
        customer: business.stripe_customer_id,
        status: "trialing",
        limit: 1,
      });

      if (subscriptions.data.length === 0) continue;

      const subscription = subscriptions.data[0];

      // Get the business owner's email
      const { data: businessUsers } = await supabase
        .from("business_users")
        .select("user_id, role")
        .eq("business_id", business.id)
        .eq("role", "owner")
        .limit(1);

      if (!businessUsers || businessUsers.length === 0) continue;

      const { data: userData } = await supabase.auth.admin.getUserById(
        businessUsers[0].user_id
      );

      if (!userData?.user?.email) continue;

      const email = userData.user.email;

      // Create email content based on days remaining
      let subject = "";
      let html = "";

      if (daysRemaining === 7) {
        subject = "Your À La Carte Chat trial ends in 7 days";
        html = `
          <h1>Your trial ends in 7 days</h1>
          <p>Hi ${business.name} team,</p>
          <p>Your 14-day trial of À La Carte Chat is going great! You have <strong>7 days remaining</strong> to explore all features.</p>
          <h2>What happens next?</h2>
          <ul>
            <li>Your trial ends on ${trialEnd.toLocaleDateString()}</li>
            <li>You'll automatically be charged for the plan you selected</li>
            <li>All your data and settings will remain intact</li>
          </ul>
          <p><strong>Want to change your plan?</strong> Visit your <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/app/settings?tab=subscription">subscription settings</a> anytime.</p>
          <p>Questions? Reply to this email or contact support@alacartechat.com</p>
          <p>Best regards,<br>The À La Carte Chat Team</p>
        `;
      } else if (daysRemaining === 3) {
        subject = "Your À La Carte Chat trial ends in 3 days";
        html = `
          <h1>Your trial ends in 3 days</h1>
          <p>Hi ${business.name} team,</p>
          <p>Just a quick reminder that your À La Carte Chat trial ends in <strong>3 days</strong> on ${trialEnd.toLocaleDateString()}.</p>
          <h2>What you need to know:</h2>
          <ul>
            <li>✅ Your payment method is on file</li>
            <li>✅ Billing starts automatically when trial ends</li>
            <li>✅ Zero downtime - everything keeps working</li>
          </ul>
          <p><strong>Not ready to subscribe?</strong> You can <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/app/settings?tab=subscription">cancel anytime</a> before ${trialEnd.toLocaleDateString()} to avoid charges.</p>
          <p>Need help? We're here: support@alacartechat.com</p>
          <p>Best regards,<br>The À La Carte Chat Team</p>
        `;
      } else if (daysRemaining === 1) {
        subject = "Your À La Carte Chat trial ends tomorrow";
        html = `
          <h1>Your trial ends tomorrow</h1>
          <p>Hi ${business.name} team,</p>
          <p>This is your final reminder: your À La Carte Chat trial ends <strong>tomorrow</strong> on ${trialEnd.toLocaleDateString()}.</p>
          <h2>Tomorrow at this time:</h2>
          <ul>
            <li>💳 Your payment method will be charged</li>
            <li>🚀 Your subscription begins with full access</li>
            <li>📊 All your conversations and data remain safe</li>
          </ul>
          <p><strong>Want to make changes?</strong> Visit <a href="${supabaseUrl.replace('.supabase.co', '.lovable.app')}/app/settings?tab=subscription">subscription settings</a> now.</p>
          <p><strong>Have questions?</strong> Contact us immediately at support@alacartechat.com</p>
          <p>Thank you for choosing À La Carte Chat!</p>
          <p>Best regards,<br>The À La Carte Chat Team</p>
        `;
      }

      // Send the email via transactional email function
      const { error: emailError } = await supabase.functions.invoke(
        "send-transactional-email",
        {
          body: {
            to: email,
            subject: subject,
            html: html,
            type: "notification",
          },
        }
      );

      if (emailError) {
        console.error(`Failed to send email to ${email}:`, emailError);
      } else {
        console.log(`✅ Trial ending email sent to ${email} (${daysRemaining} days)`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Processed ${businesses?.length || 0} businesses`,
        emailsSent: businesses?.length || 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-trial-ending-email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
