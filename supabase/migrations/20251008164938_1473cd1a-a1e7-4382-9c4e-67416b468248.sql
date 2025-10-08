-- Create email operation logs table for detailed tracing
CREATE TABLE IF NOT EXISTS public.email_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN (
    'account_create', 'account_test', 'account_update', 'account_delete',
    'sync_start', 'sync_step', 'sync_complete',
    'send_start', 'send_step', 'send_complete',
    'imap_connect', 'imap_auth', 'imap_fetch',
    'smtp_connect', 'smtp_auth', 'smtp_send'
  )),
  status TEXT NOT NULL DEFAULT 'started' CHECK (status IN ('started', 'in_progress', 'success', 'warning', 'error')),
  step_number INTEGER DEFAULT 0,
  step_name TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  error_code TEXT,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index for efficient querying
CREATE INDEX idx_email_operation_logs_account_id ON public.email_operation_logs(email_account_id);
CREATE INDEX idx_email_operation_logs_created_at ON public.email_operation_logs(created_at DESC);
CREATE INDEX idx_email_operation_logs_status ON public.email_operation_logs(status);
CREATE INDEX idx_email_operation_logs_operation_type ON public.email_operation_logs(operation_type);

-- Enable RLS
ALTER TABLE public.email_operation_logs ENABLE ROW LEVEL SECURITY;

-- Business members can view logs for their accounts
CREATE POLICY "Business members can view email operation logs"
  ON public.email_operation_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.email_accounts ea
      WHERE ea.id = email_operation_logs.email_account_id
      AND user_belongs_to_business(auth.uid(), ea.business_id)
    )
    OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- System can insert logs
CREATE POLICY "System can insert email operation logs"
  ON public.email_operation_logs
  FOR INSERT
  WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.email_operation_logs;