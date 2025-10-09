
-- Create system_test_results table
CREATE TABLE IF NOT EXISTS public.system_test_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  test_name text NOT NULL,
  test_category text NOT NULL,
  status text NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
  details jsonb DEFAULT '{}'::jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamp with time zone DEFAULT now(),
  run_by uuid REFERENCES auth.users(id)
);

-- Create api_usage_tracking table
CREATE TABLE IF NOT EXISTS public.api_usage_tracking (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  usage_count integer DEFAULT 0,
  usage_limit integer NOT NULL,
  usage_date date DEFAULT CURRENT_DATE,
  details jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE (service_name, usage_date)
);

-- Create usage_alerts_sent table
CREATE TABLE IF NOT EXISTS public.usage_alerts_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_name text NOT NULL,
  alert_level integer NOT NULL CHECK (alert_level IN (80, 90, 95)),
  alert_date date DEFAULT CURRENT_DATE,
  sent_at timestamp with time zone DEFAULT now(),
  UNIQUE (service_name, alert_level, alert_date)
);

-- Enable RLS
ALTER TABLE public.system_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_alerts_sent ENABLE ROW LEVEL SECURITY;

-- RLS Policies for system_test_results
CREATE POLICY "Superadmins can view test results"
ON public.system_test_results FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert test results"
ON public.system_test_results FOR INSERT
WITH CHECK (true);

-- RLS Policies for api_usage_tracking
CREATE POLICY "Superadmins can view usage tracking"
ON public.api_usage_tracking FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can manage usage tracking"
ON public.api_usage_tracking FOR ALL
USING (true);

-- RLS Policies for usage_alerts_sent
CREATE POLICY "Superadmins can view alerts"
ON public.usage_alerts_sent FOR SELECT
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "System can insert alerts"
ON public.usage_alerts_sent FOR INSERT
WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_test_results_created ON public.system_test_results(created_at DESC);
CREATE INDEX idx_test_results_status ON public.system_test_results(status);
CREATE INDEX idx_usage_tracking_date ON public.api_usage_tracking(usage_date DESC);
CREATE INDEX idx_alerts_sent_date ON public.usage_alerts_sent(alert_date DESC);

-- Insert initial API tracking records
INSERT INTO public.api_usage_tracking (service_name, usage_count, usage_limit, details)
VALUES 
  ('virustotal', 0, 500, '{"reset": "daily", "tier": "free"}'::jsonb),
  ('resend', 0, 3000, '{"reset": "monthly", "tier": "free"}'::jsonb),
  ('supabase_db', 0, 8000000, '{"reset": "monthly", "unit": "mb"}'::jsonb),
  ('supabase_storage', 0, 5000, '{"reset": "monthly", "unit": "mb"}'::jsonb)
ON CONFLICT (service_name, usage_date) DO NOTHING;
