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

    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    const { data: userData } = await supabase.auth.getUser(token || "");
    const userId = userData?.user?.id;

    console.log("[SYSTEM-TESTS] Starting automated test suite");

    const results = [];
    const startTime = Date.now();

    // Test 1: Database Table Verification
    const dbTest = await testDatabaseTables(supabase);
    results.push(dbTest);
    await saveTestResult(supabase, dbTest, userId);

    // Test 2: RLS Policy Check
    const rlsTest = await testRLSPolicies(supabase);
    results.push(rlsTest);
    await saveTestResult(supabase, rlsTest, userId);

    // Test 3: Configuration Consistency
    const configTest = await testConfiguration(supabase);
    results.push(configTest);
    await saveTestResult(supabase, configTest, userId);

    // Test 4: Data Integrity
    const dataTest = await testDataIntegrity(supabase);
    results.push(dataTest);
    await saveTestResult(supabase, dataTest, userId);

    // Test 5: Secrets Verification
    const secretsTest = await testSecrets();
    results.push(secretsTest);
    await saveTestResult(supabase, secretsTest, userId);

    const totalDuration = Date.now() - startTime;
    const passCount = results.filter(r => r.status === 'pass').length;
    const failCount = results.filter(r => r.status === 'fail').length;
    const warnCount = results.filter(r => r.status === 'warning').length;

    console.log(`[SYSTEM-TESTS] Complete: ${passCount} passed, ${failCount} failed, ${warnCount} warnings`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total: results.length,
          passed: passCount,
          failed: failCount,
          warnings: warnCount,
          duration: totalDuration
        },
        results
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    console.error("[SYSTEM-TESTS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function testDatabaseTables(supabase: any) {
  const start = Date.now();
  const requiredTables = [
    'businesses', 'customers', 'conversations', 'messages',
    'business_users', 'user_roles', 'invoices', 'pending_subscriptions',
    'security_logs', 'api_usage_tracking', 'system_test_results'
  ];

  const missing = [];
  for (const table of requiredTables) {
    const { error } = await supabase.from(table).select('id').limit(0);
    if (error) missing.push(table);
  }

  return {
    test_name: "Database Tables Verification",
    test_category: "database",
    status: missing.length === 0 ? 'pass' : 'fail',
    details: {
      checked: requiredTables.length,
      missing: missing.length,
      missing_tables: missing
    },
    error_message: missing.length > 0 ? `Missing tables: ${missing.join(', ')}` : null,
    duration_ms: Date.now() - start
  };
}

async function testRLSPolicies(supabase: any) {
  const start = Date.now();
  const tablesWithRLS = [];
  const tablesWithoutRLS = [];

  const tables = ['businesses', 'customers', 'conversations', 'messages'];

  for (const table of tables) {
    // Try to query as anonymous - should fail if RLS is enabled
    const { error } = await supabase.from(table).select('*').limit(1);
    if (error?.code === 'PGRST301' || error?.message?.includes('row-level security')) {
      tablesWithRLS.push(table);
    } else {
      tablesWithoutRLS.push(table);
    }
  }

  return {
    test_name: "RLS Policy Check",
    test_category: "security",
    status: tablesWithoutRLS.length === 0 ? 'pass' : 'warning',
    details: {
      with_rls: tablesWithRLS,
      without_rls: tablesWithoutRLS
    },
    error_message: tablesWithoutRLS.length > 0 ? `Tables without RLS: ${tablesWithoutRLS.join(', ')}` : null,
    duration_ms: Date.now() - start
  };
}

async function testConfiguration(supabase: any) {
  const start = Date.now();
  const issues = [];

  // Check if businesses have valid subscription tiers
  const { data: businesses } = await supabase
    .from('businesses')
    .select('id, subscription_tier, subscription_status');

  const validTiers = ['free', 'starter', 'professional', 'enterprise'];
  const validStatuses = ['trialing', 'active', 'past_due', 'canceled', 'incomplete'];

  for (const business of businesses || []) {
    if (!validTiers.includes(business.subscription_tier)) {
      issues.push(`Invalid tier: ${business.subscription_tier} for business ${business.id}`);
    }
    if (!validStatuses.includes(business.subscription_status)) {
      issues.push(`Invalid status: ${business.subscription_status} for business ${business.id}`);
    }
  }

  return {
    test_name: "Configuration Consistency",
    test_category: "configuration",
    status: issues.length === 0 ? 'pass' : 'warning',
    details: {
      businesses_checked: businesses?.length || 0,
      issues_found: issues.length,
      issues
    },
    error_message: issues.length > 0 ? `Found ${issues.length} configuration issues` : null,
    duration_ms: Date.now() - start
  };
}

async function testDataIntegrity(supabase: any) {
  const start = Date.now();
  const issues = [];

  // Check for orphaned conversations (customer doesn't exist)
  const { data: orphanedConvs } = await supabase.rpc('execute_sql', {
    query: `
      SELECT COUNT(*) as count 
      FROM conversations c 
      LEFT JOIN customers cu ON c.customer_id = cu.id 
      WHERE cu.id IS NULL
    `
  }).single();

  if (orphanedConvs?.count > 0) {
    issues.push(`${orphanedConvs.count} orphaned conversations`);
  }

  // Check for messages without conversations
  const { data: orphanedMsgs } = await supabase
    .from('messages')
    .select('id, conversation_id')
    .is('conversation_id', null);

  if (orphanedMsgs?.length > 0) {
    issues.push(`${orphanedMsgs.length} messages without conversations`);
  }

  return {
    test_name: "Data Integrity Check",
    test_category: "data",
    status: issues.length === 0 ? 'pass' : 'warning',
    details: {
      checks_performed: 2,
      issues_found: issues.length,
      issues
    },
    error_message: issues.length > 0 ? `Found ${issues.length} data integrity issues` : null,
    duration_ms: Date.now() - start
  };
}

async function testSecrets() {
  const start = Date.now();
  const requiredSecrets = [
    'STRIPE_SECRET_KEY',
    'RESEND_API_KEY',
    'VIRUSTOTAL_API_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  const missing = requiredSecrets.filter(secret => !Deno.env.get(secret));

  return {
    test_name: "Secrets Verification",
    test_category: "security",
    status: missing.length === 0 ? 'pass' : 'fail',
    details: {
      required: requiredSecrets.length,
      configured: requiredSecrets.length - missing.length,
      missing
    },
    error_message: missing.length > 0 ? `Missing secrets: ${missing.join(', ')}` : null,
    duration_ms: Date.now() - start
  };
}

async function saveTestResult(supabase: any, result: any, userId: string | undefined) {
  await supabase.from('system_test_results').insert({
    ...result,
    run_by: userId
  });
}
