-- Create calendar_sync_config table for storing calendar sync settings
CREATE TABLE public.calendar_sync_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- General settings
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Sync configuration
  provider TEXT NOT NULL CHECK (provider IN ('google', 'outlook', 'apple', 'caldav', 'webcal')),
  calendar_url TEXT,
  api_key TEXT,
  refresh_token TEXT,
  access_token TEXT,
  sync_interval_minutes INTEGER NOT NULL DEFAULT 15,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  
  -- What to sync
  sync_tasks BOOLEAN NOT NULL DEFAULT true,
  sync_completed_tasks BOOLEAN NOT NULL DEFAULT false,
  
  -- Export settings
  default_timezone TEXT NOT NULL DEFAULT 'UTC',
  include_description BOOLEAN NOT NULL DEFAULT true,
  include_attendees BOOLEAN NOT NULL DEFAULT false,
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.calendar_sync_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admins can manage calendar sync config"
  ON public.calendar_sync_config
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view calendar sync config"
  ON public.calendar_sync_config
  FOR SELECT
  USING (true);

-- Add trigger for updated_at
CREATE TRIGGER update_calendar_sync_config_updated_at
  BEFORE UPDATE ON public.calendar_sync_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create calendar_export_log table to track exports
CREATE TABLE public.calendar_export_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  export_type TEXT NOT NULL CHECK (export_type IN ('task', 'manual')),
  entity_id UUID,
  entity_type TEXT,
  exported_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  sync_config_id UUID REFERENCES public.calendar_sync_config(id)
);

-- Enable RLS
ALTER TABLE public.calendar_export_log ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view export logs"
  ON public.calendar_export_log
  FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create export logs"
  ON public.calendar_export_log
  FOR INSERT
  WITH CHECK (true);