import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { workflowId, attachmentId, messageId, triggerType } = await req.json();
    
    console.log("Executing workflow:", { workflowId, attachmentId, messageId, triggerType });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Load workflow and steps
    const { data: workflow, error: workflowError } = await supabase
      .from("document_workflows")
      .select("*")
      .eq("id", workflowId)
      .single();

    if (workflowError) throw workflowError;

    const { data: steps, error: stepsError } = await supabase
      .from("workflow_steps")
      .select("*")
      .eq("workflow_id", workflowId)
      .order("step_order", { ascending: true });

    if (stepsError) throw stepsError;

    // Create execution record
    const { data: execution, error: execError } = await supabase
      .from("workflow_executions")
      .insert({
        workflow_id: workflowId,
        attachment_id: attachmentId,
        message_id: messageId,
        status: "running",
        execution_data: {},
      })
      .select()
      .single();

    if (execError) throw execError;

    // Execute steps sequentially
    let currentStep = steps[0];
    const executionContext: any = {
      attachment_id: attachmentId,
      message_id: messageId,
      parsed_data: {},
      document_type: null,
    };

    while (currentStep) {
      console.log(`Executing step: ${currentStep.step_type}`, currentStep.id);
      
      try {
        // Execute step based on type
        switch (currentStep.step_type) {
          case "parse": {
            const parseResult = await supabase.functions.invoke("universal-document-parser", {
              body: {
                attachmentId,
                businessId: workflow.business_id,
                ...currentStep.step_config,
              },
            });
            
            if (parseResult.error) throw parseResult.error;
            executionContext.parsed_data = parseResult.data.parsed_data;
            executionContext.confidence_score = parseResult.data.confidence_score;
            break;
          }

          case "document_type": {
            const classifyResult = await supabase.functions.invoke("classify-document-type", {
              body: {
                attachmentId,
                businessId: workflow.business_id,
                ...currentStep.step_config,
              },
            });
            
            if (classifyResult.error) throw classifyResult.error;
            executionContext.document_type = classifyResult.data.document_type;
            executionContext.document_type_id = classifyResult.data.document_type_id;
            break;
          }

          case "condition": {
            const conditions = currentStep.step_config.conditions || [];
            const logic = currentStep.step_config.logic || "AND";
            
            const results = conditions.map((cond: any) => {
              const value = executionContext.parsed_data[cond.field];
              switch (cond.operator) {
                case "equals": return value === cond.value;
                case "not_equals": return value !== cond.value;
                case "contains": return String(value).includes(cond.value);
                case "not_contains": return !String(value).includes(cond.value);
                case "exists": return value !== undefined && value !== null;
                case "not_exists": return value === undefined || value === null;
                case "greater_than": return Number(value) > Number(cond.value);
                case "less_than": return Number(value) < Number(cond.value);
                default: return false;
              }
            });

            const conditionMet = logic === "AND" ? results.every(r => r) : results.some(r => r);
            executionContext.condition_result = conditionMet;
            
            // Determine next step based on condition
            currentStep = steps.find(s => s.id === (conditionMet ? currentStep.next_step_on_success : currentStep.next_step_on_failure));
            continue;
          }

          case "transform": {
            const mappings = currentStep.step_config.mapping || [];
            const transformed: any = {};
            
            for (const mapping of mappings) {
              let value = executionContext.parsed_data[mapping.sourceField];
              
              // Apply transformation
              switch (mapping.transformation) {
                case "uppercase": value = String(value).toUpperCase(); break;
                case "lowercase": value = String(value).toLowerCase(); break;
                case "trim": value = String(value).trim(); break;
                case "format_phone": value = String(value).replace(/\D/g, ''); break;
              }
              
              transformed[mapping.outputField] = value;
            }
            
            executionContext.transformed_data = transformed;
            break;
          }

          case "api_action": {
            // Variable substitution helper
            const substitute = (template: string) => {
              return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
                const parts = key.trim().split('.');
                let value = executionContext;
                for (const part of parts) {
                  value = value?.[part];
                }
                return value ?? '';
              });
            };

            const config = currentStep.step_config;
            const url = substitute(config.endpoint_url || '');
            const method = config.http_method || 'POST';
            
            const headers: any = { 'Content-Type': 'application/json' };
            if (config.headers) {
              Object.entries(config.headers).forEach(([key, value]) => {
                headers[key] = substitute(String(value));
              });
            }

            let body = config.body_template || {};
            if (typeof body === 'string') {
              body = substitute(body);
            } else {
              body = JSON.parse(substitute(JSON.stringify(body)));
            }

            // Make API call with retry logic
            let attempt = 0;
            const maxRetries = config.max_retries || 3;
            let apiSuccess = false;

            while (attempt < maxRetries && !apiSuccess) {
              try {
                const response = await fetch(url, {
                  method,
                  headers,
                  body: method !== 'GET' ? JSON.stringify(body) : undefined,
                });

                if (response.ok) {
                  const data = await response.json().catch(() => ({}));
                  executionContext.api_response = data;
                  apiSuccess = true;
                } else {
                  throw new Error(`API call failed: ${response.status}`);
                }
              } catch (error) {
                attempt++;
                if (attempt >= maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
              }
            }
            break;
          }

          case "delay": {
            const duration = currentStep.step_config.duration || 5;
            const unit = currentStep.step_config.unit || "seconds";
            const ms = unit === "seconds" ? duration * 1000 :
                      unit === "minutes" ? duration * 60000 :
                      unit === "hours" ? duration * 3600000 :
                      duration * 86400000; // days
            
            await new Promise(resolve => setTimeout(resolve, ms));
            break;
          }

          case "end": {
            // Workflow complete
            currentStep = null;
            continue;
          }
        }

        // Move to next step (success path by default)
        if (currentStep.step_type !== "condition") {
          currentStep = steps.find(s => s.id === currentStep.next_step_on_success);
        }

      } catch (stepError) {
        console.error(`Step ${currentStep.step_type} failed:`, stepError);
        
        // Try failure path
        if (currentStep.next_step_on_failure) {
          currentStep = steps.find(s => s.id === currentStep.next_step_on_failure);
        } else {
          // No failure path, abort
          throw stepError;
        }
      }
    }

    // Update execution as completed
    await supabase
      .from("workflow_executions")
      .update({
        status: "completed",
        completed_at: new Date().toISOString(),
        execution_data: executionContext,
      })
      .eq("id", execution.id);

    // Log to audit trail
    await supabase
      .from("workflow_audit_log")
      .insert({
        workflow_execution_id: execution.id,
        action: "workflow_completed",
        metadata: { workflow_id: workflowId },
      });

    return new Response(
      JSON.stringify({ success: true, execution_id: execution.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Workflow execution error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
