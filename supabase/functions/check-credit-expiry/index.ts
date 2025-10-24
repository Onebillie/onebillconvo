import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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
    console.log("[CHECK-CREDIT-EXPIRY] Starting credit expiry check...");
    
    const now = new Date();
    const thirtyDaysFromNow = new Date(now);
    thirtyDaysFromNow.setDate(now.getDate() + 30);

    // Find all businesses with credits expiring within 30 days
    const { data: businesses, error: fetchError } = await supabaseClient
      .from('businesses')
      .select('id, name, owner_id, credit_balance, credit_expiry_date, invoice_email')
      .gt('credit_balance', 0)
      .not('credit_expiry_date', 'is', null)
      .lte('credit_expiry_date', thirtyDaysFromNow.toISOString());

    if (fetchError) {
      console.error("[CHECK-CREDIT-EXPIRY] Error fetching businesses:", fetchError);
      throw fetchError;
    }

    console.log(`[CHECK-CREDIT-EXPIRY] Found ${businesses?.length || 0} businesses with expiring credits`);

    for (const business of businesses || []) {
      const expiryDate = new Date(business.credit_expiry_date);
      const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      console.log(`[CHECK-CREDIT-EXPIRY] Business ${business.id}: ${daysUntilExpiry} days until expiry`);

      // Determine warning type based on days remaining
      let warningType = null;
      if (daysUntilExpiry <= 0) {
        warningType = 'expired';
      } else if (daysUntilExpiry <= 1) {
        warningType = '1_day';
      } else if (daysUntilExpiry <= 3) {
        warningType = '3_days';
      } else if (daysUntilExpiry <= 7) {
        warningType = '7_days';
      } else if (daysUntilExpiry <= 14) {
        warningType = '14_days';
      } else if (daysUntilExpiry <= 30) {
        warningType = '30_days';
      }

      if (!warningType) continue;

      // Check if we've already sent this warning
      const { data: existingWarning } = await supabaseClient
        .from('credit_expiry_warnings')
        .select('id')
        .eq('business_id', business.id)
        .eq('warning_type', warningType)
        .eq('expiry_date', business.credit_expiry_date)
        .maybeSingle();

      if (existingWarning) {
        console.log(`[CHECK-CREDIT-EXPIRY] Warning already sent for business ${business.id}, type: ${warningType}`);
        continue;
      }

      // If expired, zero out credits
      if (warningType === 'expired') {
        console.log(`[CHECK-CREDIT-EXPIRY] Zeroing out expired credits for business ${business.id}`);
        
        const { error: updateError } = await supabaseClient
          .from('businesses')
          .update({ 
            credit_balance: 0,
            credit_expiry_date: null 
          })
          .eq('id', business.id);

        if (updateError) {
          console.error(`[CHECK-CREDIT-EXPIRY] Error updating business ${business.id}:`, updateError);
        }
      }

      // Get owner email
      const { data: owner } = await supabaseClient
        .from('profiles')
        .select('email, full_name')
        .eq('id', business.owner_id)
        .single();

      const recipientEmail = business.invoice_email || owner?.email;
      
      if (!recipientEmail) {
        console.error(`[CHECK-CREDIT-EXPIRY] No email found for business ${business.id}`);
        continue;
      }

      // Send email notification
      const emailSubject = warningType === 'expired'
        ? '⚠️ Your Credits Have Expired'
        : `⏰ Credits Expiring ${warningType === '1_day' ? 'Tomorrow' : `in ${daysUntilExpiry} Days`}`;

      const emailBody = warningType === 'expired'
        ? `
          <h2>Your Credits Have Expired</h2>
          <p>Hi ${owner?.full_name || 'there'},</p>
          <p><strong>${business.credit_balance.toLocaleString()} credits</strong> have expired and have been removed from your account.</p>
          <p>To continue using our services, please purchase a new credit bundle:</p>
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.com')}/app/dashboard" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">Purchase Credits</a></p>
          <p>Credits expire 1 year from purchase date and are non-refundable.</p>
        `
        : `
          <h2>Your Credits Are Expiring Soon</h2>
          <p>Hi ${owner?.full_name || 'there'},</p>
          <p><strong>${business.credit_balance.toLocaleString()} credits</strong> will expire on <strong>${expiryDate.toLocaleDateString()}</strong> (${daysUntilExpiry} days from now).</p>
          <p>Use your credits before they expire, or purchase more to ensure uninterrupted service:</p>
          <p><a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.com')}/app/dashboard" style="display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px;">View Dashboard</a></p>
          <p><small>Credits expire 1 year from purchase date and are non-refundable.</small></p>
        `;

      // Send email via send-transactional-email function
      const { error: emailError } = await supabaseClient.functions.invoke('send-transactional-email', {
        body: {
          to: recipientEmail,
          subject: emailSubject,
          html: emailBody,
        }
      });

      if (emailError) {
        console.error(`[CHECK-CREDIT-EXPIRY] Error sending email to ${recipientEmail}:`, emailError);
      } else {
        console.log(`[CHECK-CREDIT-EXPIRY] Email sent to ${recipientEmail} (${warningType})`);
      }

      // Record that we sent this warning
      const { error: warningError } = await supabaseClient
        .from('credit_expiry_warnings')
        .insert({
          business_id: business.id,
          warning_type: warningType,
          credits_amount: business.credit_balance,
          expiry_date: business.credit_expiry_date,
        });

      if (warningError) {
        console.error(`[CHECK-CREDIT-EXPIRY] Error recording warning:`, warningError);
      }
    }

    console.log("[CHECK-CREDIT-EXPIRY] Credit expiry check completed successfully");

    return new Response(JSON.stringify({ 
      success: true, 
      processed: businesses?.length || 0 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[CHECK-CREDIT-EXPIRY] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
