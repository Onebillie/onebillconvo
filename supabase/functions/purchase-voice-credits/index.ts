import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16',
    });

    // Get auth header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');

    // Verify user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { bundle_id } = await req.json();

    if (!bundle_id) {
      throw new Error('bundle_id is required');
    }

    // Get bundle details
    const { data: bundle, error: bundleError } = await supabase
      .from('voice_credit_bundles')
      .select('*')
      .eq('id', bundle_id)
      .eq('is_active', true)
      .single();

    if (bundleError || !bundle) {
      throw new Error('Bundle not found or inactive');
    }

    // Get user's business
    const { data: businessUser, error: businessUserError } = await supabase
      .from('business_users')
      .select('business_id, businesses(id, name)')
      .eq('user_id', user.id)
      .single();

    if (businessUserError || !businessUser) {
      throw new Error('Business not found');
    }

    // Create Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: bundle.name,
              description: `${bundle.minutes} voice calling minutes`,
            },
            unit_amount: bundle.price_cents,
          },
          quantity: 1,
        },
      ],
      success_url: `${req.headers.get('origin')}/app/settings?tab=billing&voice_purchase=success`,
      cancel_url: `${req.headers.get('origin')}/app/settings?tab=billing&voice_purchase=cancelled`,
      client_reference_id: businessUser.business_id,
      metadata: {
        type: 'voice_credits',
        business_id: businessUser.business_id,
        bundle_id: bundle.id,
        minutes: bundle.minutes.toString(),
        user_id: user.id,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        sessionId: session.id,
        url: session.url
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error purchasing voice credits:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
