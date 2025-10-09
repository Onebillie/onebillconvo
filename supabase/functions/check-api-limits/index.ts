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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("[API-LIMITS] Fetching current usage data");

    const today = new Date().toISOString().split('T')[0];

    // Get or create today's usage records
    const { data: usageData, error: usageError } = await supabase
      .from("api_usage_tracking")
      .select("*")
      .eq("usage_date", today);

    if (usageError) throw usageError;

    // If no data for today, initialize
    if (!usageData || usageData.length === 0) {
      const initialData = [
        { service_name: 'virustotal', usage_count: 0, usage_limit: 500, details: { reset: "daily", tier: "free" } },
        { service_name: 'resend', usage_count: 0, usage_limit: 3000, details: { reset: "monthly", tier: "free" } },
        { service_name: 'supabase_db', usage_count: 0, usage_limit: 8000, details: { reset: "monthly", unit: "mb" } },
        { service_name: 'supabase_storage', usage_count: 0, usage_limit: 5000, details: { reset: "monthly", unit: "mb" } }
      ];

      await supabase.from("api_usage_tracking").insert(initialData);

      return new Response(
        JSON.stringify({ success: true, usage: initialData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Get actual VirusTotal usage from security_logs
    const { data: vtScans } = await supabase
      .from("security_logs")
      .select("id")
      .gte("created_at", `${today}T00:00:00Z`)
      .in("event_type", ["file_scan_clean", "malware_detected", "file_scan_pending"]);

    if (vtScans) {
      await supabase
        .from("api_usage_tracking")
        .update({ usage_count: vtScans.length, updated_at: new Date().toISOString() })
        .eq("service_name", "virustotal")
        .eq("usage_date", today);
    }

    // Fetch updated data
    const { data: updatedUsage } = await supabase
      .from("api_usage_tracking")
      .select("*")
      .eq("usage_date", today);

    const enrichedUsage = (updatedUsage || []).map(service => ({
      ...service,
      usage_percent: ((service.usage_count / service.usage_limit) * 100).toFixed(1),
      status: getStatusLevel(service.usage_count, service.usage_limit),
      remaining: service.usage_limit - service.usage_count
    }));

    console.log("[API-LIMITS] Current usage:", enrichedUsage);

    return new Response(
      JSON.stringify({ 
        success: true, 
        usage: enrichedUsage,
        timestamp: new Date().toISOString()
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[API-LIMITS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function getStatusLevel(used: number, limit: number): string {
  const percent = (used / limit) * 100;
  if (percent >= 95) return "critical";
  if (percent >= 90) return "warning";
  if (percent >= 80) return "caution";
  return "healthy";
}
