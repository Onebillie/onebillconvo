-- Fix workflow_steps.step_type constraint to include all node types
ALTER TABLE public.workflow_steps
DROP CONSTRAINT IF EXISTS workflow_steps_step_type_check;

ALTER TABLE public.workflow_steps
ADD CONSTRAINT workflow_steps_step_type_check
CHECK (step_type IN ('trigger', 'parse', 'document_type', 'condition', 'transform', 'api_action', 'delay', 'end'));

-- Fix document_workflows.trigger_type to include message_received
ALTER TABLE public.document_workflows
DROP CONSTRAINT IF EXISTS document_workflows_trigger_type_check;

ALTER TABLE public.document_workflows
ADD CONSTRAINT document_workflows_trigger_type_check
CHECK (trigger_type IN ('attachment_received', 'message_received', 'manual', 'scheduled'));