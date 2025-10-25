-- Call Records table
CREATE TABLE IF NOT EXISTS public.call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  twilio_call_sid TEXT UNIQUE NOT NULL,
  parent_call_sid TEXT,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_number TEXT NOT NULL,
  to_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in-progress', 'completed', 'busy', 'no-answer', 'failed', 'canceled')),
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  agent_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  queue_name TEXT,
  recording_url TEXT,
  recording_sid TEXT,
  transcript TEXT,
  voicemail_url TEXT,
  caller_name TEXT,
  call_type TEXT CHECK (call_type IN ('direct', 'queue', 'transfer', 'voicemail')),
  transfer_type TEXT CHECK (transfer_type IN ('warm', 'cold')),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call Queues configuration
CREATE TABLE IF NOT EXISTS public.call_queues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  phone_number TEXT,
  routing_strategy TEXT NOT NULL DEFAULT 'round-robin' CHECK (routing_strategy IN ('round-robin', 'least-recent', 'skills-based')),
  max_wait_time INTEGER DEFAULT 300,
  music_url TEXT,
  enabled BOOLEAN DEFAULT true,
  business_hours JSONB DEFAULT '{}'::jsonb,
  after_hours_action TEXT DEFAULT 'voicemail' CHECK (after_hours_action IN ('voicemail', 'forward', 'hangup')),
  after_hours_number TEXT,
  voicemail_greeting_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, name)
);

-- Agent Availability tracking
CREATE TABLE IF NOT EXISTS public.agent_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'offline' CHECK (status IN ('online', 'busy', 'away', 'offline')),
  current_call_sid TEXT,
  device_type TEXT CHECK (device_type IN ('browser', 'phone')),
  device_number TEXT,
  last_call_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(business_id, agent_id)
);

-- Call Events log (detailed event stream)
CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_record_id UUID NOT NULL REFERENCES public.call_records(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Recording Consent log
CREATE TABLE IF NOT EXISTS public.call_recording_consent (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_record_id UUID NOT NULL REFERENCES public.call_records(id) ON DELETE CASCADE,
  consent_given BOOLEAN NOT NULL,
  consent_method TEXT CHECK (consent_method IN ('ivr', 'verbal', 'implied')),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Call Configuration per business
CREATE TABLE IF NOT EXISTS public.call_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE UNIQUE,
  recording_enabled BOOLEAN DEFAULT true,
  require_recording_consent BOOLEAN DEFAULT true,
  transcription_enabled BOOLEAN DEFAULT true,
  callback_mode_enabled BOOLEAN DEFAULT false,
  ivr_enabled BOOLEAN DEFAULT false,
  crm_webhook_url TEXT,
  crm_webhook_token TEXT,
  caller_lookup_url TEXT,
  retention_days INTEGER DEFAULT 90,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_call_records_business_id ON public.call_records(business_id);
CREATE INDEX IF NOT EXISTS idx_call_records_agent_id ON public.call_records(agent_id);
CREATE INDEX IF NOT EXISTS idx_call_records_status ON public.call_records(status);
CREATE INDEX IF NOT EXISTS idx_call_records_started_at ON public.call_records(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_call_records_twilio_sid ON public.call_records(twilio_call_sid);
CREATE INDEX IF NOT EXISTS idx_call_events_call_record_id ON public.call_events(call_record_id);
CREATE INDEX IF NOT EXISTS idx_agent_availability_business_agent ON public.agent_availability(business_id, agent_id);
CREATE INDEX IF NOT EXISTS idx_call_queues_business_id ON public.call_queues(business_id);

-- RLS Policies - Restrict to OneBillChat business users only
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_queues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agent_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_recording_consent ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_settings ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user belongs to OneBillChat business
CREATE OR REPLACE FUNCTION is_onebillchat_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.business_users bu
    JOIN public.businesses b ON bu.business_id = b.id
    WHERE bu.user_id = auth.uid()
    AND (b.name ILIKE '%OneBill%' OR b.slug ILIKE '%onebill%')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies for call_records
CREATE POLICY "OneBillChat users can view call records"
  ON public.call_records FOR SELECT
  USING (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "OneBillChat users can insert call records"
  ON public.call_records FOR INSERT
  WITH CHECK (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

CREATE POLICY "OneBillChat users can update call records"
  ON public.call_records FOR UPDATE
  USING (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

-- RLS Policies for call_queues
CREATE POLICY "OneBillChat users can manage queues"
  ON public.call_queues FOR ALL
  USING (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

-- RLS Policies for agent_availability
CREATE POLICY "OneBillChat users can manage availability"
  ON public.agent_availability FOR ALL
  USING (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

-- RLS Policies for call_events
CREATE POLICY "OneBillChat users can view call events"
  ON public.call_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_records cr
    WHERE cr.id = call_events.call_record_id
    AND cr.business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  ) AND is_onebillchat_user());

CREATE POLICY "Service role can insert call events"
  ON public.call_events FOR INSERT
  WITH CHECK (true);

-- RLS Policies for call_recording_consent
CREATE POLICY "OneBillChat users can view consent"
  ON public.call_recording_consent FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.call_records cr
    WHERE cr.id = call_recording_consent.call_record_id
    AND cr.business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  ) AND is_onebillchat_user());

CREATE POLICY "Service role can manage consent"
  ON public.call_recording_consent FOR ALL
  USING (true);

-- RLS Policies for call_settings
CREATE POLICY "OneBillChat users can manage settings"
  ON public.call_settings FOR ALL
  USING (is_onebillchat_user() AND business_id IN (
    SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
  ));

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_call_records_updated_at
  BEFORE UPDATE ON public.call_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_queues_updated_at
  BEFORE UPDATE ON public.call_queues
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_agent_availability_updated_at
  BEFORE UPDATE ON public.agent_availability
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_settings_updated_at
  BEFORE UPDATE ON public.call_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();