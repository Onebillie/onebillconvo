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

    // Handle configuration fetch (no authentication required - just customization)
    if (body.action === 'get_config') {
      console.log('Fetching config for site:', siteId);
      
      const { data: customization } = await supabase
        .from("widget_customization")
        .select("*")
        .eq("business_id", business.id)
        .eq("embed_token_id", siteData.embed_token_id)
        .maybeSingle();
      
      return new Response(JSON.stringify({
        success: true,
        business_name: business.name,
        customization: customization || {
          primary_color: '#6366f1',
          widget_position: 'bottom-right',
          widget_size: 'medium',
          widget_shape: 'circle',
          icon_type: 'chat',
          show_button_text: false,
          button_text: 'Chat with us',
          welcome_message: 'Hi! How can we help?',
          greeting_message: 'Hi! How can we help?'
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Handle session revalidation requests
    if (body.action === 'revalidate') {
      const sessionToken = req.headers.get('x-session-token');
      
      if (!sessionToken) {
        return new Response(JSON.stringify({ success: false, error: 'Missing session token' }), 
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Validate session token
      const { data: session, error: sessionError } = await supabase
        .from('embed_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('site_id', siteId)
        .gt('expires_at', new Date().toISOString())
        .single();
      
      if (sessionError || !session) {
        console.log('Session revalidation failed:', sessionError);
        return new Response(JSON.stringify({ success: false, error: 'Session expired' }), 
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      
      // Fetch FRESH customization from database for this specific token
      const { data: customization } = await supabase
        .from("widget_customization")
        .select("*")
        .eq("business_id", business.id)
        .eq("embed_token_id", siteData.embed_token_id)
        .maybeSingle();
      
      console.log('Session revalidated successfully, returning fresh customization');
      
      return new Response(JSON.stringify({
        success: true,
        session: {
          session_token: sessionToken,
          customer_id: session.customer_id,
          conversation_id: session.conversation_id,
          expires_at: session.expires_at
        },
        business_name: business.name,
        customization: customization || {
          primary_color: '#6366f1',
          widget_position: 'bottom-right',
          widget_size: 'medium',
          widget_shape: 'circle',
          icon_type: 'chat',
          show_button_text: false,
          button_text: 'Chat with us',
          welcome_message: 'Hi! How can we help?',
          greeting_message: 'Hi! How can we help?'
        }
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    
    const name = body.customer_name ?? body.name;
    const email = body.customer_email ?? body.email;
    const phone = body.customer_phone ?? body.phone;
    const customData = body.custom_data ?? body.customData;

    let customerId: string;
    const businessId = business.id;
    
    // Normalize phone number for consistent matching
    const normalizePhone = (phoneNum: string | null): string | null => {
      if (!phoneNum) return null;
      let cleaned = phoneNum.replace(/[\s\-\(\)\.]/g, '');
      if (cleaned.startsWith('+')) cleaned = cleaned.substring(1);
      if (cleaned.startsWith('00')) cleaned = cleaned.substring(2);
      if (cleaned.startsWith('353')) return cleaned;
      if (cleaned.startsWith('0')) return '353' + cleaned.substring(1);
      if (cleaned.length === 9 && /^[1-9]/.test(cleaned)) return '353' + cleaned;
      return cleaned;
    };
    
    const normalizedPhone = normalizePhone(phone);
    
    // Check for existing customers with matching email or phone
    let existingCustomers: any[] = [];
    if (email || normalizedPhone) {
      const { data: customers, error: lookupError } = await supabase
        .from('customers')
        .select('id, name, email, phone')
        .eq('business_id', businessId)
        .or(
          email && normalizedPhone 
            ? `email.eq.${email},phone.eq.${normalizedPhone}`
            : email 
              ? `email.eq.${email}`
              : `phone.eq.${normalizedPhone}`
        );
      
      if (!lookupError && customers && customers.length > 0) {
        existingCustomers = customers;
        console.log('[embed-auth] Found existing customers:', existingCustomers.length);
      }
    }
    
    // If existing customer found, return duplicate_found flag for merge flow
    if (existingCustomers.length > 0) {
      const existingCustomer = existingCustomers[0];
      console.log('[embed-auth] Duplicate customer detected:', existingCustomer.id);
      
      return new Response(JSON.stringify({
        success: true,
        duplicate_found: true,
        existing_customer: {
          id: existingCustomer.id,
          name: existingCustomer.name,
          email: existingCustomer.email,
          phone: existingCustomer.phone
        },
        new_details: {
          name,
          email,
          phone: normalizedPhone
        }
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    // No duplicate found - create new customer
    const customerName = name || email || normalizedPhone || 'Anonymous';
    const { data: newCustomer, error: customerError } = await supabase
      .from('customers')
      .insert({
        business_id: businessId,
        name: customerName,
        email: email || null,
        phone: normalizedPhone || null,
        last_contact_method: 'embed',
        last_active: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (customerError || !newCustomer) {
      console.error('[embed-auth] Error creating customer:', customerError);
      return new Response(JSON.stringify({ error: 'Failed to create customer' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    
    customerId = newCustomer.id;
    console.log('[embed-auth] New session customer created:', customerId);

    // WIDGET SESSION ISOLATION: Reuse existing conversation but track session start
    // This allows admin to see full history while customer only sees current session
    const { data: existingConversations } = await supabase
      .from('conversations')
      .select('id, metadata')
      .eq('customer_id', customerId)
      .eq('business_id', businessId)
      .order('created_at', { ascending: false })
      .limit(1);

    let conversationId: string;
    let isNewConversation = false;
    const sessionStart = new Date().toISOString();

    if (existingConversations && existingConversations.length > 0) {
      // Reuse existing conversation
      conversationId = existingConversations[0].id;
      
      // Update metadata to track this new widget session
      const existingMetadata = existingConversations[0].metadata as Record<string, any> || {};
      await supabase
        .from('conversations')
        .update({
          metadata: {
            ...existingMetadata,
            latest_widget_session: sessionStart,
            channel: 'website_widget'
          },
          status: 'active' // Reactivate if it was closed
        })
        .eq('id', conversationId);
      
      console.log('[embed-auth] Reusing existing conversation:', conversationId);
    } else {
      // Create new conversation for first-time widget users
      const { data: newConversation, error: conversationError } = await supabase
        .from('conversations')
        .insert({
          customer_id: customerId,
          business_id: businessId,
          status: 'active',
          priority: 5,
          metadata: { 
            source: 'embed', 
            channel: 'website_widget',
            privacy_scoped: true,
            session_start: sessionStart
          }
        })
        .select('id')
        .single();

      if (conversationError || !newConversation) {
        console.error('[embed-auth] Error creating conversation:', conversationError);
        return new Response(JSON.stringify({ error: 'Failed to create conversation' }), 
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      
      conversationId = newConversation.id;
      isNewConversation = true;
      console.log('[embed-auth] New conversation created:', conversationId);
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

    // Fetch widget customization for this specific token
    const { data: customization } = await supabase
      .from("widget_customization")
      .select("*")
      .eq("business_id", businessId)
      .eq("embed_token_id", siteData.embed_token_id)
      .maybeSingle();
    
    // Send welcome message for new conversations (but only if AI triage is disabled or AI first response is disabled)
    if (isNewConversation) {
      const { data: aiSettings } = await supabase
        .from('embed_ai_settings')
        .select('ai_triage_enabled, ai_first_response_enabled')
        .eq('business_id', businessId)
        .maybeSingle();
      
      const shouldSendWelcome = !aiSettings?.ai_triage_enabled || !aiSettings?.ai_first_response_enabled;
      
      if (shouldSendWelcome && customization?.greeting_message) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: conversationId,
            content: customization.greeting_message,
            direction: 'outbound',
            platform: 'embed',
            status: 'delivered',
            metadata: { system_message: true, welcome: true }
          });
        console.log('Welcome message sent:', customization.greeting_message);
      }
    }

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
        widget_shape: 'circle',
        icon_type: 'chat',
        show_button_text: false,
        button_text: 'Chat with us',
        welcome_message: 'Hi! How can we help?',
        greeting_message: 'Hi! How can we help?',
        require_contact_info: true,
        sound_notifications: true,
        start_minimized: true
      }
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
