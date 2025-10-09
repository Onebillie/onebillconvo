import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const state = url.searchParams.get('state');
    const { accountId } = await req.json();

    if (!code || !state) {
      throw new Error('Missing code or state');
    }

    // Verify state
    const { data: stateData, error: stateError } = await supabase
      .from('oauth_states')
      .select('*')
      .eq('state', state)
      .eq('provider', 'google')
      .single();

    if (stateError || !stateData) {
      throw new Error('Invalid state');
    }

    // Delete used state
    await supabase.from('oauth_states').delete().eq('state', state);

    // Exchange code for tokens
    const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
    const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;
    const redirectUri = `${supabaseUrl}/functions/v1/oauth-google-callback`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens = await tokenResponse.json();

    if (!tokens.access_token) {
      throw new Error('Failed to get access token');
    }

    // Get user email from Google
    const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` }
    });
    const profile = await profileResponse.json();

    // Update email account with OAuth tokens
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    await supabase
      .from('email_accounts')
      .update({
        auth_method: 'oauth',
        oauth_provider: 'google',
        oauth_access_token: tokens.access_token,
        oauth_refresh_token: tokens.refresh_token,
        oauth_token_expires_at: expiresAt.toISOString(),
        oauth_scopes: tokens.scope?.split(' ') || [],
        email_address: profile.email,
      })
      .eq('id', accountId);

    return new Response(
      JSON.stringify({ success: true, email: profile.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});