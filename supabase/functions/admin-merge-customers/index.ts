import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

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
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { primary_customer_id, duplicate_customer_ids, default_email } = await req.json();

    if (!primary_customer_id || !duplicate_customer_ids || !Array.isArray(duplicate_customer_ids)) {
      return new Response(
        JSON.stringify({ error: 'Invalid input: primary_customer_id and duplicate_customer_ids[] required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting merge:', { primary_customer_id, duplicate_customer_ids, default_email });

    // Get all customer records
    const allCustomerIds = [primary_customer_id, ...duplicate_customer_ids];
    const { data: customers, error: customersError } = await supabase
      .from('customers')
      .select('*')
      .in('id', allCustomerIds);

    if (customersError) throw customersError;

    // Consolidate emails
    const allEmails = new Set<string>();
    customers?.forEach(c => {
      if (c.email) allEmails.add(c.email.toLowerCase());
      if (c.alternate_emails) {
        c.alternate_emails.forEach((e: string) => allEmails.add(e.toLowerCase()));
      }
    });
    allEmails.delete(default_email?.toLowerCase() || '');
    const alternateEmails = Array.from(allEmails);

    // Update primary customer with consolidated emails
    const { error: updateCustomerError } = await supabase
      .from('customers')
      .update({
        email: default_email,
        alternate_emails: alternateEmails,
        updated_at: new Date().toISOString(),
      })
      .eq('id', primary_customer_id);

    if (updateCustomerError) throw updateCustomerError;

    // Get all conversations for all customers
    const { data: allConversations, error: convsError } = await supabase
      .from('conversations')
      .select('*')
      .in('customer_id', allCustomerIds)
      .order('updated_at', { ascending: false });

    if (convsError) throw convsError;

    let canonicalConversationId: string;

    // Find or create canonical conversation
    const activeConvForPrimary = allConversations?.find(
      c => c.customer_id === primary_customer_id && c.status === 'active'
    );

    if (activeConvForPrimary) {
      canonicalConversationId = activeConvForPrimary.id;
      console.log('Using existing active conversation as canonical:', canonicalConversationId);
    } else {
      // Use the most recent conversation or create new one
      if (allConversations && allConversations.length > 0) {
        canonicalConversationId = allConversations[0].id;
        console.log('Using most recent conversation as canonical:', canonicalConversationId);
        
        // Update it to belong to primary customer and be active
        const { error: updateConvError } = await supabase
          .from('conversations')
          .update({
            customer_id: primary_customer_id,
            status: 'active',
            updated_at: new Date().toISOString(),
          })
          .eq('id', canonicalConversationId);
        
        if (updateConvError) throw updateConvError;
      } else {
        // Create new canonical conversation
        const { data: newConv, error: createConvError } = await supabase
          .from('conversations')
          .insert({
            customer_id: primary_customer_id,
            business_id: customers?.[0]?.business_id,
            status: 'active',
            priority: 5,
            metadata: { merged: true, source: 'merge' },
          })
          .select()
          .single();

        if (createConvError) throw createConvError;
        canonicalConversationId = newConv.id;
        console.log('Created new canonical conversation:', canonicalConversationId);
      }
    }

    // Move all messages from other conversations to canonical
    const otherConversationIds = allConversations
      ?.filter(c => c.id !== canonicalConversationId)
      .map(c => c.id) || [];

    if (otherConversationIds.length > 0) {
      console.log('Moving messages from conversations:', otherConversationIds);
      
      const { error: moveMessagesError } = await supabase
        .from('messages')
        .update({ conversation_id: canonicalConversationId })
        .in('conversation_id', otherConversationIds);

      if (moveMessagesError) throw moveMessagesError;

      // Update last_message_at based on all messages
      const { data: lastMessage, error: lastMsgError } = await supabase
        .from('messages')
        .select('created_at')
        .eq('conversation_id', canonicalConversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!lastMsgError && lastMessage) {
        await supabase
          .from('conversations')
          .update({ last_message_at: lastMessage.created_at })
          .eq('id', canonicalConversationId);
      }

      // Delete empty conversations
      const { error: deleteConvsError } = await supabase
        .from('conversations')
        .delete()
        .in('id', otherConversationIds);

      if (deleteConvsError) {
        console.warn('Error deleting empty conversations:', deleteConvsError);
      }
    }

    // Delete duplicate customers
    const { error: deleteCustomersError } = await supabase
      .from('customers')
      .delete()
      .in('id', duplicate_customer_ids);

    if (deleteCustomersError) {
      console.warn('Error deleting duplicate customers:', deleteCustomersError);
    }

    // Log the merge for audit
    const { error: auditError } = await supabase
      .from('business_audit_log')
      .insert({
        business_id: customers?.[0]?.business_id,
        user_id: user.id,
        action: 'merge_customers',
        resource_type: 'customer',
        resource_id: primary_customer_id,
        metadata: {
          duplicate_customer_ids,
          canonical_conversation_id: canonicalConversationId,
          merged_at: new Date().toISOString(),
        },
      });

    if (auditError) {
      console.warn('Error logging audit:', auditError);
    }

    console.log('Merge completed successfully');

    return new Response(
      JSON.stringify({ 
        success: true,
        canonical_conversation_id: canonicalConversationId,
        messages_merged: otherConversationIds.length > 0,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in admin-merge-customers:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
