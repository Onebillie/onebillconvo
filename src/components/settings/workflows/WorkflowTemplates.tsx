import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Zap, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

export function WorkflowTemplates() {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { currentBusinessId } = useAuth();

  const createOneBillWorkflow = async () => {
    setIsCreating(true);
    try {
      if (!currentBusinessId) throw new Error("No business found");

      // 1. Create Document Types
      const { data: docTypes, error: docTypesError } = await supabase
        .from("document_types")
        .insert([
          {
            business_id: currentBusinessId,
            name: "Electricity File",
            description: "Electricity bill or document containing MPRN/DG reference",
            ai_detection_keywords: ["electricity", "ESB", "Electric Ireland", "MPRN", "DG", "kWh"],
            required_fields: [
              { name: "phone", type: "string", isPII: true, description: "Customer phone number" },
              { name: "mprn", type: "string", isPII: false, description: "Meter Point Reference Number" },
              { name: "dg", type: "string", isPII: false, description: "DG reference" },
              { name: "mcc_type", type: "string", isPII: false, description: "MCC type code" },
              { name: "dg_type", type: "string", isPII: false, description: "DG type code" }
            ]
          },
          {
            business_id: currentBusinessId,
            name: "Gas File",
            description: "Gas bill or document containing GPRN reference",
            ai_detection_keywords: ["gas", "natural gas", "Bord Gáis", "GPRN"],
            required_fields: [
              { name: "phone", type: "string", isPII: true, description: "Customer phone number" },
              { name: "gprn", type: "string", isPII: false, description: "Gas Point Reference Number" }
            ]
          },
          {
            business_id: currentBusinessId,
            name: "Meter Reading",
            description: "Photo of gas or electricity meter reading",
            ai_detection_keywords: ["meter", "reading", "meter reading", "display"],
            required_fields: [
              { name: "phone", type: "string", isPII: true, description: "Customer phone number" }
            ]
          }
        ])
        .select();

      if (docTypesError) throw docTypesError;

      // 2. Create API Endpoints
      const { data: apiEndpoints, error: apiError } = await supabase
        .from("api_endpoints")
        .insert([
          {
            business_id: currentBusinessId,
            name: "OneBill Electricity File API",
            endpoint_url: "https://api.onebill.ie/api/electricity-file",
            http_method: "POST",
            headers: { "Content-Type": "application/json" },
            body_template: {
              phone: "{{parsed_data.phone}}",
              mprn: "{{parsed_data.mprn}}",
              mcc_type: "{{parsed_data.mcc_type}}",
              dg_type: "{{parsed_data.dg_type}}",
              file: "{{attachment.url}}"
            }
          },
          {
            business_id: currentBusinessId,
            name: "OneBill Gas File API",
            endpoint_url: "https://api.onebill.ie/api/gas-file",
            http_method: "POST",
            headers: { "Content-Type": "application/json" },
            body_template: {
              phone: "{{parsed_data.phone}}",
              gprn: "{{parsed_data.gprn}}",
              file: "{{attachment.url}}"
            }
          },
          {
            business_id: currentBusinessId,
            name: "OneBill Meter File API",
            endpoint_url: "https://api.onebill.ie/api/meter-file",
            http_method: "POST",
            headers: { "Content-Type": "application/json" },
            body_template: {
              phone: "{{parsed_data.phone}}",
              file: "{{attachment.url}}"
            }
          }
        ])
        .select();

      if (apiError) throw apiError;

      // 3. Create Workflow
      const { data: workflow, error: workflowError } = await supabase
        .from("document_workflows")
        .insert({
          business_id: currentBusinessId,
          name: "OneBill Utility Processing",
          description: "Automatically parse, classify, and route electricity, gas, and meter reading documents to OneBill API",
          trigger_type: "attachment_received",
          trigger_config: {
            filters: {
              fileTypes: ["pdf", "png", "jpg", "jpeg"]
            }
          },
          is_active: false
        })
        .select()
        .single();

      if (workflowError) throw workflowError;

      // 4. Create Workflow Steps
      const steps = [
        {
          workflow_id: workflow.id,
          step_name: "Parse Document",
          step_type: "parse",
          step_order: 1,
          step_config: {
            provider: "lovable_ai",
            model: "google/gemini-2.5-flash",
            enablePIIMasking: true,
            confidenceThreshold: 0.7,
            extractionSchema: {
              phone: { type: "string", description: "Customer phone number in +353 format" },
              mprn: { type: "string", description: "Meter Point Reference Number (electricity)" },
              dg: { type: "string", description: "DG reference code" },
              mcc_type: { type: "string", description: "MCC type code" },
              dg_type: { type: "string", description: "DG type code" },
              gprn: { type: "string", description: "Gas Point Reference Number" }
            }
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Check Electricity Fields",
          step_type: "condition",
          step_order: 2,
          step_config: {
            conditions: [
              { id: crypto.randomUUID(), field: "parsed_data.mprn", operator: "exists", value: "", logicalOperator: "OR" },
              { id: crypto.randomUUID(), field: "parsed_data.dg", operator: "exists", value: "", logicalOperator: "OR" }
            ]
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Send to Electricity API",
          step_type: "api_action",
          step_order: 3,
          step_config: {
            method: "POST",
            url: "https://api.onebill.ie/api/electricity-file",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: JSON.stringify({
              phone: "{{parsed_data.phone}}",
              mprn: "{{parsed_data.mprn}}",
              mcc_type: "{{parsed_data.mcc_type}}",
              dg_type: "{{parsed_data.dg_type}}",
              file: "{{attachment.url}}"
            }),
            timeoutMs: 30000,
            retryConfig: { maxRetries: 3 }
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Check Gas Field",
          step_type: "condition",
          step_order: 4,
          step_config: {
            conditions: [
              { id: crypto.randomUUID(), field: "parsed_data.gprn", operator: "exists", value: "", logicalOperator: "AND" }
            ]
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Send to Gas API",
          step_type: "api_action",
          step_order: 5,
          step_config: {
            method: "POST",
            url: "https://api.onebill.ie/api/gas-file",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: JSON.stringify({
              phone: "{{parsed_data.phone}}",
              gprn: "{{parsed_data.gprn}}",
              file: "{{attachment.url}}"
            }),
            timeoutMs: 30000,
            retryConfig: { maxRetries: 3 }
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Send to Meter API (Default)",
          step_type: "api_action",
          step_order: 6,
          step_config: {
            method: "POST",
            url: "https://api.onebill.ie/api/meter-file",
            headers: { "Content-Type": "application/json" },
            bodyTemplate: JSON.stringify({
              phone: "{{parsed_data.phone}}",
              file: "{{attachment.url}}"
            }),
            timeoutMs: 30000,
            retryConfig: { maxRetries: 3 }
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Success",
          step_type: "end",
          step_order: 7,
          step_config: {
            status: "success"
          }
        },
        {
          workflow_id: workflow.id,
          step_name: "Failed",
          step_type: "end",
          step_order: 8,
          step_config: {
            status: "failure"
          }
        }
      ];

      const { error: stepsError } = await supabase
        .from("workflow_steps")
        .insert(steps);

      if (stepsError) throw stepsError;

      // Update steps with next_step references
      const { data: createdSteps } = await supabase
        .from("workflow_steps")
        .select("id, step_order")
        .eq("workflow_id", workflow.id)
        .order("step_order");

      if (createdSteps) {
        const updates = [
          // Parse -> Check Electricity
          { id: createdSteps[0].id, next_step_on_success: createdSteps[1].id },
          // Check Electricity -> Electricity API (success) or Check Gas (failure)
          { id: createdSteps[1].id, next_step_on_success: createdSteps[2].id, next_step_on_failure: createdSteps[3].id },
          // Electricity API -> Success
          { id: createdSteps[2].id, next_step_on_success: createdSteps[6].id, next_step_on_failure: createdSteps[7].id },
          // Check Gas -> Gas API (success) or Meter API (failure/default)
          { id: createdSteps[3].id, next_step_on_success: createdSteps[4].id, next_step_on_failure: createdSteps[5].id },
          // Gas API -> Success
          { id: createdSteps[4].id, next_step_on_success: createdSteps[6].id, next_step_on_failure: createdSteps[7].id },
          // Meter API -> Success
          { id: createdSteps[5].id, next_step_on_success: createdSteps[6].id, next_step_on_failure: createdSteps[7].id }
        ];

        for (const update of updates) {
          await supabase
            .from("workflow_steps")
            .update({
              next_step_on_success: update.next_step_on_success,
              next_step_on_failure: update.next_step_on_failure
            })
            .eq("id", update.id);
        }
      }

      toast.success("OneBill workflow created successfully! You can now activate it.");
      queryClient.invalidateQueries({ queryKey: ["workflows"] });
    } catch (error: any) {
      console.error("Error creating workflow:", error);
      toast.error(error.message || "Failed to create workflow");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Workflow Templates</CardTitle>
        <CardDescription>
          Quick-start with pre-configured workflows for common use cases
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border rounded-lg p-4 hover:border-primary transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="font-semibold">OneBill Utility Processing</h3>
            </div>
            <Button
              onClick={createOneBillWorkflow}
              disabled={isCreating}
              size="sm"
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Workflow"
              )}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">
            Automatically parse, classify, and route electricity bills, gas bills, and meter readings to OneBill API endpoints.
          </p>
          <div className="text-xs space-y-1">
            <p className="font-medium">Includes:</p>
            <ul className="list-disc list-inside text-muted-foreground space-y-1">
              <li>3 Document Types (Electricity, Gas, Meter)</li>
              <li>3 API Endpoints (pre-configured for OneBill)</li>
              <li>AI-powered parsing with field extraction</li>
              <li>Smart classification based on parsed data</li>
              <li>Automatic routing to correct API endpoint</li>
              <li>Fallback to meter API if unclear</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
