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

    const { account_id } = await req.json();

    // Get email account
    const { data: account, error: accountError } = await supabase
      .from('email_accounts')
      .select('*')
      .eq('id', account_id)
      .single();

    if (accountError || !account || account.auth_method !== 'oauth') {
      throw new Error('Invalid account or not OAuth');
    }

    // Check if token needs refresh (expires in less than 5 minutes)
    const expiresAt = new Date(account.oauth_token_expires_at);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

    if (expiresAt > fiveMinutesFromNow) {
      return new Response(
        JSON.stringify({ success: true, refreshed: false, message: 'Token still valid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Refresh token based on provider
    let newAccessToken, newRefreshToken, expiresIn;

    if (account.oauth_provider === 'google') {
      const clientId = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID')!;
      const clientSecret = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET')!;

      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: account.oauth_refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error_description || 'Failed to refresh token');
      }

      newAccessToken = data.access_token;
      newRefreshToken = data.refresh_token || account.oauth_refresh_token;
      expiresIn = data.expires_in;
    } else {
      throw new Error(`Provider ${account.oauth_provider} not yet supported`);
    }

    // Update account with new tokens
    const newExpiresAt = new Date(Date.now() + expiresIn * 1000);
    await supabase
      .from('email_accounts')
      .update({
        oauth_access_token: newAccessToken,
        oauth_refresh_token: newRefreshToken,
        oauth_token_expires_at: newExpiresAt.toISOString(),
      })
      .eq('id', account_id);

    return new Response(
      JSON.stringify({ success: true, refreshed: true, expires_at: newExpiresAt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Token refresh error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});