-- Create security_logs table for malware scanning and security events
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL CHECK (event_type IN (
    'malware_detected',
    'suspicious_file_type', 
    'file_scan_clean',
    'file_scan_pending',
    'file_scan_error',
    'auth_failed',
    'rate_limit_exceeded'
  )),
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view security logs
CREATE POLICY "Admins can view all security logs"
ON public.security_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Policy: Service role can insert logs
CREATE POLICY "Service role can insert security logs"
ON public.security_logs
FOR INSERT
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_security_logs_event_type ON public.security_logs(event_type);
CREATE INDEX idx_security_logs_severity ON public.security_logs(severity);
CREATE INDEX idx_security_logs_created_at ON public.security_logs(created_at DESC);
CREATE INDEX idx_security_logs_customer_id ON public.security_logs(customer_id) WHERE customer_id IS NOT NULL;