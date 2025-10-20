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

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all businesses with active subscriptions
    const { data: businesses } = await supabaseAdmin
      .from('businesses')
      .select(`
        id,
        name,
        email,
        business_users!inner (
          users!inner (
            email
          )
        )
      `)
      .eq('subscription_status', 'active');

    if (!businesses || businesses.length === 0) {
      return new Response(JSON.stringify({ message: "No active businesses found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    for (const business of businesses) {
      // Get usage stats for the past week
      const { data: messages } = await supabaseAdmin
        .from('messages')
        .select('id, platform, direction, conversations!inner(business_id)')
        .eq('conversations.business_id', business.id)
        .gte('created_at', oneWeekAgo.toISOString());

      const totalMessages = messages?.length || 0;
      const sentMessages = messages?.filter(m => m.direction === 'outbound').length || 0;
      const receivedMessages = messages?.filter(m => m.direction === 'inbound').length || 0;

      const platformBreakdown = messages?.reduce((acc, msg) => {
        acc[msg.platform] = (acc[msg.platform] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Send email to business admin(s)
      const adminEmail = business.business_users[0]?.users?.email || business.email;

      if (adminEmail) {
        await supabaseAdmin.functions.invoke('send-transactional-email', {
          body: {
            to: adminEmail,
            subject: `Weekly Usage Report - ${business.name}`,
            html: `
              <h2>Weekly Usage Report</h2>
              <p>Here's your usage summary for the past 7 days:</p>
              
              <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin-top: 0;">Message Summary</h3>
                <ul>
                  <li><strong>Total Messages:</strong> ${totalMessages}</li>
                  <li><strong>Sent:</strong> ${sentMessages}</li>
                  <li><strong>Received:</strong> ${receivedMessages}</li>
                </ul>
                
                <h3>Platform Breakdown</h3>
                <ul>
                  ${Object.entries(platformBreakdown || {}).map(([platform, count]) => 
                    `<li><strong>${platform}:</strong> ${count}</li>`
                  ).join('')}
                </ul>
              </div>
              
              <p>Keep up the great work! 🚀</p>
              <p><a href="${Deno.env.get('APP_URL')}/app/dashboard">View Dashboard</a></p>
            `,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ message: `Sent ${businesses.length} weekly reports` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error('Error sending weekly reports:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
