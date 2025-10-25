-- Create notification preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Browser/PWA notifications
  browser_enabled BOOLEAN DEFAULT false,
  
  -- Email notification settings
  email_enabled BOOLEAN DEFAULT true,
  email_address TEXT,
  
  -- Notification types
  notify_widget_chat BOOLEAN DEFAULT true,
  notify_whatsapp BOOLEAN DEFAULT true,
  notify_email BOOLEAN DEFAULT true,
  notify_facebook BOOLEAN DEFAULT true,
  notify_instagram BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT true,
  notify_tasks BOOLEAN DEFAULT true,
  notify_inmail BOOLEAN DEFAULT true,
  
  -- Batching settings
  immediate_channels TEXT[] DEFAULT ARRAY['widget', 'whatsapp'],
  batch_interval TEXT DEFAULT 'hourly', -- 'immediate', 'hourly', '6hours', 'daily'
  
  -- Priority settings
  auto_status_on_priority BOOLEAN DEFAULT false,
  priority_status_id UUID REFERENCES public.statuses(id) ON DELETE SET NULL,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  UNIQUE(user_id, business_id)
);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Create batched notifications queue table
CREATE TABLE IF NOT EXISTS public.notification_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  notification_type TEXT NOT NULL, -- 'message', 'task', 'inmail'
  channel TEXT, -- 'widget', 'whatsapp', 'email', 'facebook', 'instagram', 'sms'
  priority TEXT DEFAULT 'normal', -- 'immediate', 'high', 'normal', 'low'
  
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  
  metadata JSONB DEFAULT '{}'::jsonb,
  
  sent BOOLEAN DEFAULT false,
  sent_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notification_queue ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own queued notifications"
  ON public.notification_queue FOR SELECT
  USING (auth.uid() = user_id);

-- Create index for batch processing
CREATE INDEX IF NOT EXISTS idx_notification_queue_unsent 
  ON public.notification_queue(business_id, sent, created_at) 
  WHERE sent = false;

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notification_preferences_updated_at
  BEFORE UPDATE ON public.notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();