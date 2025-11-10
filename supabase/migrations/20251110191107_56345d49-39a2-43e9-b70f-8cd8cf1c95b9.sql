-- ================================================================
-- PHASE 1: Universal Document Workflow System - Database Schema
-- ================================================================

-- 1. DOCUMENT_WORKFLOWS TABLE
-- Stores user-defined workflows for processing documents
CREATE TABLE IF NOT EXISTS public.document_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  trigger_type TEXT NOT NULL DEFAULT 'attachment_received' CHECK (trigger_type IN ('attachment_received', 'manual', 'scheduled')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Index for faster lookups
CREATE INDEX idx_document_workflows_business ON public.document_workflows(business_id);
CREATE INDEX idx_document_workflows_active ON public.document_workflows(business_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.document_workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business workflows"
  ON public.document_workflows FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business workflows"
  ON public.document_workflows FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_document_workflows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER document_workflows_updated_at
  BEFORE UPDATE ON public.document_workflows
  FOR EACH ROW
  EXECUTE FUNCTION update_document_workflows_updated_at();

-- ================================================================

-- 2. DOCUMENT_TYPES TABLE
-- Business-configurable document types for classification
CREATE TABLE IF NOT EXISTS public.document_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  ai_detection_keywords TEXT[] DEFAULT '{}',
  required_fields JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(business_id, name)
);

-- Indexes
CREATE INDEX idx_document_types_business ON public.document_types(business_id);
CREATE INDEX idx_document_types_active ON public.document_types(business_id, is_active) WHERE is_active = true;

-- RLS Policies
ALTER TABLE public.document_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business document types"
  ON public.document_types FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business document types"
  ON public.document_types FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER document_types_updated_at
  BEFORE UPDATE ON public.document_types
  FOR EACH ROW
  EXECUTE FUNCTION update_document_workflows_updated_at();

-- ================================================================

-- 3. WORKFLOW_STEPS TABLE
-- Individual steps within a workflow
CREATE TABLE IF NOT EXISTS public.workflow_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.document_workflows(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  step_type TEXT NOT NULL CHECK (step_type IN ('trigger', 'parse', 'condition', 'action', 'delay', 'end')),
  step_config JSONB DEFAULT '{}',
  next_step_on_success UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  next_step_on_failure UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_workflow_steps_workflow ON public.workflow_steps(workflow_id);
CREATE INDEX idx_workflow_steps_order ON public.workflow_steps(workflow_id, step_order);

-- RLS Policies
ALTER TABLE public.workflow_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow steps"
  ON public.workflow_steps FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.document_workflows
      WHERE business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage their workflow steps"
  ON public.workflow_steps FOR ALL
  USING (
    workflow_id IN (
      SELECT id FROM public.document_workflows
      WHERE business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
      )
    )
  )
  WITH CHECK (
    workflow_id IN (
      SELECT id FROM public.document_workflows
      WHERE business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
      )
    )
  );

-- Trigger for updated_at
CREATE TRIGGER workflow_steps_updated_at
  BEFORE UPDATE ON public.workflow_steps
  FOR EACH ROW
  EXECUTE FUNCTION update_document_workflows_updated_at();

-- ================================================================

-- 4. WORKFLOW_ACTIONS TABLE
-- Reusable action definitions
CREATE TABLE IF NOT EXISTS public.workflow_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('api_call', 'email', 'whatsapp', 'notification', 'webhook', 'storage')),
  name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(business_id, name)
);

-- Indexes
CREATE INDEX idx_workflow_actions_business ON public.workflow_actions(business_id);
CREATE INDEX idx_workflow_actions_type ON public.workflow_actions(business_id, action_type);

-- RLS Policies
ALTER TABLE public.workflow_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business actions"
  ON public.workflow_actions FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business actions"
  ON public.workflow_actions FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER workflow_actions_updated_at
  BEFORE UPDATE ON public.workflow_actions
  FOR EACH ROW
  EXECUTE FUNCTION update_document_workflows_updated_at();

-- ================================================================

-- 5. API_ENDPOINTS TABLE
-- User-configured API endpoints for workflow actions
CREATE TABLE IF NOT EXISTS public.api_endpoints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  http_method TEXT NOT NULL DEFAULT 'POST' CHECK (http_method IN ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')),
  headers JSONB DEFAULT '{}',
  body_template JSONB DEFAULT '{}',
  document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(business_id, name)
);

-- Indexes
CREATE INDEX idx_api_endpoints_business ON public.api_endpoints(business_id);
CREATE INDEX idx_api_endpoints_active ON public.api_endpoints(business_id, is_active) WHERE is_active = true;
CREATE INDEX idx_api_endpoints_document_type ON public.api_endpoints(document_type_id);

-- RLS Policies
ALTER TABLE public.api_endpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their business endpoints"
  ON public.api_endpoints FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage their business endpoints"
  ON public.api_endpoints FOR ALL
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Trigger for updated_at
CREATE TRIGGER api_endpoints_updated_at
  BEFORE UPDATE ON public.api_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION update_document_workflows_updated_at();

-- ================================================================

-- 6. WORKFLOW_EXECUTIONS TABLE
-- Audit trail of workflow runs
CREATE TABLE IF NOT EXISTS public.workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.document_workflows(id) ON DELETE CASCADE,
  attachment_id UUID REFERENCES public.message_attachments(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'paused')),
  current_step_id UUID REFERENCES public.workflow_steps(id) ON DELETE SET NULL,
  execution_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_workflow_executions_workflow ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_attachment ON public.workflow_executions(attachment_id);
CREATE INDEX idx_workflow_executions_message ON public.workflow_executions(message_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(status);
CREATE INDEX idx_workflow_executions_started_at ON public.workflow_executions(started_at DESC);

-- RLS Policies
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow executions"
  ON public.workflow_executions FOR SELECT
  USING (
    workflow_id IN (
      SELECT id FROM public.document_workflows
      WHERE business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage workflow executions"
  ON public.workflow_executions FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================

-- 7. WORKFLOW_AUDIT_LOG TABLE
-- Detailed audit trail for compliance and troubleshooting
CREATE TABLE IF NOT EXISTS public.workflow_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_execution_id UUID REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  ip_address TEXT,
  metadata JSONB DEFAULT '{}'
);

-- Indexes
CREATE INDEX idx_workflow_audit_log_execution ON public.workflow_audit_log(workflow_execution_id);
CREATE INDEX idx_workflow_audit_log_user ON public.workflow_audit_log(user_id);
CREATE INDEX idx_workflow_audit_log_timestamp ON public.workflow_audit_log(timestamp DESC);

-- RLS Policies
ALTER TABLE public.workflow_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their workflow audit logs"
  ON public.workflow_audit_log FOR SELECT
  USING (
    workflow_execution_id IN (
      SELECT we.id FROM public.workflow_executions we
      JOIN public.document_workflows dw ON we.workflow_id = dw.id
      WHERE dw.business_id IN (
        SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
      )
    )
  );

CREATE POLICY "Service role can manage workflow audit logs"
  ON public.workflow_audit_log FOR ALL
  USING (true)
  WITH CHECK (true);

-- ================================================================

-- 8. EXTEND ATTACHMENT_PARSE_RESULTS TABLE
-- Add workflow-related columns to existing table
ALTER TABLE public.attachment_parse_results
  ADD COLUMN IF NOT EXISTS workflow_id UUID REFERENCES public.document_workflows(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS document_type_id UUID REFERENCES public.document_types(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS confidence_score NUMERIC(3,2) CHECK (confidence_score >= 0 AND confidence_score <= 1),
  ADD COLUMN IF NOT EXISTS gdpr_compliant BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS actions_triggered JSONB DEFAULT '[]';

-- Indexes for new columns
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_workflow ON public.attachment_parse_results(workflow_id);
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_document_type ON public.attachment_parse_results(document_type_id);
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_confidence ON public.attachment_parse_results(confidence_score);

-- ================================================================

-- Add helpful comments
COMMENT ON TABLE public.document_workflows IS 'User-defined workflows for processing documents with AI';
COMMENT ON TABLE public.document_types IS 'Business-configurable document types for classification';
COMMENT ON TABLE public.workflow_steps IS 'Individual steps within a workflow (parse, condition, action, etc.)';
COMMENT ON TABLE public.workflow_actions IS 'Reusable action definitions (API calls, emails, notifications)';
COMMENT ON TABLE public.api_endpoints IS 'User-configured API endpoints for workflow actions';
COMMENT ON TABLE public.workflow_executions IS 'Audit trail of workflow execution history';
COMMENT ON TABLE public.workflow_audit_log IS 'Detailed audit log for compliance and troubleshooting';