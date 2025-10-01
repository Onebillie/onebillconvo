-- Create email accounts table
CREATE TABLE IF NOT EXISTS public.email_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email_address TEXT NOT NULL UNIQUE,
  
  -- IMAP Configuration
  imap_host TEXT NOT NULL,
  imap_port INTEGER NOT NULL DEFAULT 993,
  imap_username TEXT NOT NULL,
  imap_password TEXT NOT NULL, -- Will be encrypted via Supabase Vault
  imap_use_ssl BOOLEAN NOT NULL DEFAULT true,
  
  -- SMTP Configuration
  smtp_host TEXT NOT NULL,
  smtp_port INTEGER NOT NULL DEFAULT 465,
  smtp_username TEXT NOT NULL,
  smtp_password TEXT NOT NULL, -- Will be encrypted via Supabase Vault
  smtp_use_ssl BOOLEAN NOT NULL DEFAULT true,
  
  -- Sync Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT true,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 5,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create email sync logs table
CREATE TABLE IF NOT EXISTS public.email_sync_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email_account_id UUID NOT NULL REFERENCES public.email_accounts(id) ON DELETE CASCADE,
  sync_started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  sync_completed_at TIMESTAMP WITH TIME ZONE,
  emails_fetched INTEGER DEFAULT 0,
  emails_processed INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'running', -- running, completed, failed
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_sync_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for email_accounts
CREATE POLICY "Admins can manage email accounts"
  ON public.email_accounts
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view email accounts"
  ON public.email_accounts
  FOR SELECT
  USING (true);

-- RLS Policies for email_sync_logs
CREATE POLICY "Admins can manage sync logs"
  ON public.email_sync_logs
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view sync logs"
  ON public.email_sync_logs
  FOR SELECT
  USING (true);

-- Create updated_at trigger
CREATE TRIGGER update_email_accounts_updated_at
  BEFORE UPDATE ON public.email_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();