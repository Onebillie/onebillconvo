import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-site-id",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin"
};

function generateSessionToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const siteId = req.headers.get("x-site-id");
    if (!siteId) {
      return new Response(JSON.stringify({ error: "Missing site ID" }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: siteData, error: siteError } = await supabase
      .from("embed_sites")
      .select(`
        *,
        embed_tokens:embed_token_id (
          id,
          business_id,
          is_active,
          allowed_domains,
          businesses:business_id (
            id,
            name,
            is_frozen
          )
        )
      `)
      .eq("site_id", siteId)
      .maybeSingle();

    if (siteError || !siteData) {
      console.error('Site lookup error:', siteError);
      return new Response(JSON.stringify({ error: "Invalid site ID", details: siteError?.message }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!siteData.embed_tokens) {
      console.error('No embed token found for site:', siteId);
      return new Response(JSON.stringify({ error: "Token not found" }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const business = siteData.embed_tokens.businesses;
    const token = siteData.embed_tokens;

    if (!business || business.is_frozen) {
      console.error('Business frozen or not found:', business);
      return new Response(JSON.stringify({ error: "Service unavailable - account frozen" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (token.is_active !== true) {
      console.error('Token not active:', token.id);
      return new Response(JSON.stringify({ error: "Service unavailable - token inactive" }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Enforce domain whitelist
    const origin = req.headers.get('origin') || '';
    const allowedDomains = Array.isArray(token.allowed_domains) ? token.allowed_domains : [];
    
    if (allowedDomains.length > 0) {
      const isAllowed = allowedDomains.some((domain: string) => {
        const normalizedDomain = domain.toLowerCase().trim();
        const normalizedOrigin = origin.toLowerCase();
        return normalizedOrigin.includes(normalizedDomain);
      });
      
      if (!isAllowed) {
        console.warn('Domain not allowed:', { origin, allowed_domains: allowedDomains });
        return new Response(JSON.stringify({ 
          error: "Domain not allowed", 
          origin, 
          allowed_domains: allowedDomains,
          message: "Add your domain to Allowed Domains in Settings → Channels → Website Chat Widget"
        }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    
    const name = body.customer_name ?? body.name;
    const email = body.customer_email ?? body.email;
    const phone = body.customer_phone ?? body.phone;
    const customData = body.custom_data ?? body.customData;

    let customerId: string;
    const businessId = business.id;
    
    if (email) {
      const { data: existing, error: lookupError } = await supabase.from("customers").select("id")
        .eq("business_id", businessId).eq("email", email).maybeSingle();
      
      if (lookupError) {
        console.error('Customer lookup error:', lookupError);
        return new Response(JSON.stringify({ error: "Database error during customer lookup" }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      if (existing) {
        customerId = existing.id;
        console.log('Existing customer found:', customerId);
      } else {
        const { data: newCustomer, error: insertError } = await supabase.from("customers")
          .insert({ business_id: businessId, name: name || "Anonymous", email, phone: phone || "unknown" })
          .select("id").single();

        if (insertError || !newCustomer) {
          console.error('Customer creation error:', insertError);
          return new Response(JSON.stringify({ error: "Failed to create customer", details: insertError?.message }), 
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
        
        customerId = newCustomer.id;
        console.log('New customer created:', customerId);
      }
    } else {
      const { data: newCustomer, error: insertError } = await supabase.from("customers")
        .insert({ business_id: businessId, name: name || "Anonymous User", phone: "unknown" })
        .select("id").single();

      if (insertError || !newCustomer) {
        console.error('Anonymous customer creation error:', insertError);
        return new Response(JSON.stringify({ error: "Failed to create customer", details: insertError?.message }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      customerId = newCustomer.id;
      console.log('Anonymous customer created:', customerId);
    }

    const { data: activeConv, error: convLookupError } = await supabase.from("conversations").select("id")
      .eq("customer_id", customerId).eq("business_id", businessId)
      .is("resolved_at", null).order("created_at", { ascending: false }).limit(1).maybeSingle();

    if (convLookupError) {
      console.error('Conversation lookup error:', convLookupError);
      return new Response(JSON.stringify({ error: "Database error during conversation lookup" }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let conversationId: string;
    if (activeConv) {
      conversationId = activeConv.id;
      console.log('Active conversation found:', conversationId);
    } else {
      const { data: newConv, error: convInsertError } = await supabase.from("conversations")
        .insert({ customer_id: customerId, business_id: businessId, status: "active" })
        .select("id").single();
      
      if (convInsertError || !newConv) {
        console.error('Conversation creation error:', convInsertError);
        return new Response(JSON.stringify({ error: "Failed to create conversation", details: convInsertError?.message }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      conversationId = newConv.id;
      console.log('New conversation created:', conversationId);
    }

    const sessionToken = generateSessionToken();
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    const { error: sessionError } = await supabase.from("embed_sessions").insert({
      site_id: siteId, session_token: sessionToken, customer_id: customerId,
      conversation_id: conversationId, expires_at: expiresAt.toISOString()
    });

    if (sessionError) {
      console.error('Session creation error:', sessionError);
      return new Response(JSON.stringify({ error: "Failed to create session", details: sessionError.message }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fetch widget customization
    const { data: customization } = await supabase
      .from("widget_customization")
      .select("*")
      .eq("business_id", businessId)
      .maybeSingle();

    console.log('Auth success:', { customerId, conversationId, businessId, businessName: business.name });

    return new Response(JSON.stringify({
      success: true,
      session: {
        session_token: sessionToken,
        customer_id: customerId,
        conversation_id: conversationId,
        expires_at: expiresAt.toISOString()
      },
      business_name: business.name,
      customization: customization || {
        primary_color: '#6366f1',
        widget_position: 'bottom-right',
        widget_size: 'medium',
        icon_type: 'chat',
        show_button_text: false,
        button_text: 'Chat with us',
        greeting_message: 'Hi! How can we help?'
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
