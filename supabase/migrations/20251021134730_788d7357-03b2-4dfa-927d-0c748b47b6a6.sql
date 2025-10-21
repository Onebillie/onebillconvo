-- Create business audit log table for tracking all changes
CREATE TABLE IF NOT EXISTS public.business_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE,
  changed_by UUID REFERENCES auth.users(id),
  action TEXT NOT NULL,
  changes JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.business_audit_log ENABLE ROW LEVEL SECURITY;

-- Superadmins can view and create audit logs
CREATE POLICY "Superadmins can view audit logs"
  ON public.business_audit_log
  FOR SELECT
  USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Superadmins can create audit logs"
  ON public.business_audit_log
  FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_business_audit_log_business_id ON public.business_audit_log(business_id);
CREATE INDEX IF NOT EXISTS idx_business_audit_log_created_at ON public.business_audit_log(created_at DESC);