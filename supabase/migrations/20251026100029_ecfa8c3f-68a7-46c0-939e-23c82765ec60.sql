-- =====================================================
-- COMPREHENSIVE SECURITY & LOGGING SYSTEM
-- =====================================================

-- 1. Two-Factor Authentication Table
CREATE TABLE IF NOT EXISTS public.two_factor_auth (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  secret_key TEXT NOT NULL,
  backup_codes TEXT[],
  enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.two_factor_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own 2FA"
  ON public.two_factor_auth FOR ALL
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Superadmins can view all 2FA settings"
  ON public.two_factor_auth FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- 2. IP Whitelist Table
CREATE TABLE IF NOT EXISTS public.admin_ip_whitelist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  ip_address TEXT NOT NULL,
  ip_range TEXT,
  description TEXT,
  enabled BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.admin_ip_whitelist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage IP whitelist"
  ON public.admin_ip_whitelist FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

-- Add IP whitelist check to admin_sessions
ALTER TABLE public.admin_sessions 
ADD COLUMN IF NOT EXISTS ip_whitelisted BOOLEAN DEFAULT false;

-- 3. Comprehensive Security Audit Logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  event_category TEXT NOT NULL,
  event_type TEXT NOT NULL,
  event_action TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  ip_address TEXT,
  user_agent TEXT,
  device_fingerprint TEXT,
  resource_type TEXT,
  resource_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  request_id TEXT,
  session_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_business_id ON public.security_audit_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_event_category ON public.security_audit_logs(event_category);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON public.security_audit_logs(severity);

ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can view all audit logs"
  ON public.security_audit_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Business owners can view their business logs"
  ON public.security_audit_logs FOR SELECT
  TO authenticated
  USING (
    business_id IN (
      SELECT id FROM businesses WHERE owner_id = auth.uid()
    ) OR
    user_id = auth.uid()
  );

CREATE POLICY "System can insert audit logs"
  ON public.security_audit_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. Comprehensive API Logs
CREATE TABLE IF NOT EXISTS public.comprehensive_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) NOT NULL,
  api_key_id UUID REFERENCES api_keys(id),
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  status_code INTEGER,
  response_time_ms INTEGER,
  request_size_bytes INTEGER,
  response_size_bytes INTEGER,
  ip_address TEXT,
  user_agent TEXT,
  request_headers JSONB,
  request_body JSONB,
  response_body JSONB,
  error_message TEXT,
  rate_limit_hit BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_comprehensive_api_logs_business_id ON public.comprehensive_api_logs(business_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_api_logs_api_key_id ON public.comprehensive_api_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_comprehensive_api_logs_created_at ON public.comprehensive_api_logs(created_at DESC);

ALTER TABLE public.comprehensive_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business users can view their API logs"
  ON public.comprehensive_api_logs FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Superadmins can view all API logs"
  ON public.comprehensive_api_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "System can insert API logs"
  ON public.comprehensive_api_logs FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 5. Security Alerts Table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  business_id UUID REFERENCES businesses(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES auth.users(id),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_security_alerts_user_id ON public.security_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_business_id ON public.security_alerts(business_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_acknowledged ON public.security_alerts(acknowledged);
CREATE INDEX IF NOT EXISTS idx_security_alerts_created_at ON public.security_alerts(created_at DESC);

ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own alerts"
  ON public.security_alerts FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Business owners can view their business alerts"
  ON public.security_alerts FOR SELECT
  TO authenticated
  USING (business_id IN (SELECT id FROM businesses WHERE owner_id = auth.uid()));

CREATE POLICY "Superadmins can view all alerts"
  ON public.security_alerts FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can acknowledge their alerts"
  ON public.security_alerts FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'superadmin'));

CREATE POLICY "System can insert alerts"
  ON public.security_alerts FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 6. Helper function to check IP whitelist
CREATE OR REPLACE FUNCTION public.is_ip_whitelisted(_user_id uuid, _ip_address text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.admin_ip_whitelist
    WHERE user_id = _user_id
      AND enabled = true
      AND (
        ip_address = _ip_address
        OR (ip_range IS NOT NULL AND _ip_address::inet <<= ip_range::inet)
      )
  );
$$;

-- 7. Update trigger for two_factor_auth
CREATE OR REPLACE FUNCTION public.update_two_factor_auth_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_two_factor_auth_updated_at
  BEFORE UPDATE ON public.two_factor_auth
  FOR EACH ROW
  EXECUTE FUNCTION public.update_two_factor_auth_updated_at();