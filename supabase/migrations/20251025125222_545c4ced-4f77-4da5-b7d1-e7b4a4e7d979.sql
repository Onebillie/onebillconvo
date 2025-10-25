-- Phase 1: Message Tracking & Logging System

-- Create message_logs table for comprehensive audit trail
CREATE TABLE IF NOT EXISTS message_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now(),
  event_type TEXT NOT NULL, -- 'created', 'sent', 'delivered', 'read', 'failed', 'bounced', 'opened', 'clicked'
  status TEXT, -- 'pending', 'processing', 'success', 'failed'
  platform TEXT NOT NULL, -- 'whatsapp', 'email', 'sms', 'facebook', 'instagram'
  error_code TEXT,
  error_message TEXT,
  error_details JSONB,
  metadata JSONB, -- Store provider-specific data
  delivery_attempt INT DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_message_logs_message_id ON message_logs(message_id);
CREATE INDEX idx_message_logs_event_type ON message_logs(event_type);
CREATE INDEX idx_message_logs_timestamp ON message_logs(timestamp DESC);

-- Update messages table with enhanced tracking fields
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_content TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_name TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS template_variables JSONB;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE messages ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS bounce_reason TEXT;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS last_error JSONB;

-- Phase 2: Marketing Campaigns System

-- Marketing campaigns table
CREATE TABLE IF NOT EXISTS marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'broadcast', -- 'broadcast', 'drip', 'newsletter'
  status TEXT DEFAULT 'draft', -- 'draft', 'scheduled', 'sending', 'completed', 'paused', 'failed'
  channels TEXT[] NOT NULL DEFAULT '{}',
  
  -- Recipient filtering
  recipient_filter JSONB,
  recipient_count INT DEFAULT 0,
  
  -- Content per channel
  whatsapp_template_id TEXT,
  whatsapp_variables JSONB,
  email_subject TEXT,
  email_content TEXT,
  sms_content TEXT,
  facebook_content TEXT,
  instagram_content TEXT,
  
  -- Interactive CTAs
  cta_buttons JSONB,
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Stats
  sent_count INT DEFAULT 0,
  delivered_count INT DEFAULT 0,
  opened_count INT DEFAULT 0,
  clicked_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaigns_business_id ON marketing_campaigns(business_id);
CREATE INDEX idx_campaigns_status ON marketing_campaigns(status);
CREATE INDEX idx_campaigns_scheduled_at ON marketing_campaigns(scheduled_at) WHERE status = 'scheduled';

-- Campaign recipients tracking
CREATE TABLE IF NOT EXISTS campaign_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID REFERENCES marketing_campaigns(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'opened', 'clicked', 'failed', 'bounced'
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  opened_at TIMESTAMP WITH TIME ZONE,
  clicked_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  message_id UUID REFERENCES messages(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_campaign_recipients_campaign ON campaign_recipients(campaign_id);
CREATE INDEX idx_campaign_recipients_customer ON campaign_recipients(customer_id);
CREATE INDEX idx_campaign_recipients_status ON campaign_recipients(status);

-- Webhook configuration for email delivery tracking
CREATE TABLE IF NOT EXISTS webhook_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  webhook_type TEXT NOT NULL, -- 'email_delivery', 'sms_delivery', 'custom'
  url TEXT NOT NULL,
  events TEXT[] NOT NULL,
  secret TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_webhook_config_business ON webhook_config(business_id);

-- WhatsApp broadcast lists
CREATE TABLE IF NOT EXISTS whatsapp_broadcast_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  customer_ids UUID[] DEFAULT '{}',
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE INDEX idx_broadcast_lists_business ON whatsapp_broadcast_lists(business_id);

-- Marketing opt-outs / unsubscribes
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_unsubscribed BOOLEAN DEFAULT false;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS unsubscribe_reason TEXT;

CREATE INDEX idx_customers_unsubscribed ON customers(is_unsubscribed) WHERE is_unsubscribed = true;

-- Enable RLS on new tables
ALTER TABLE message_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE whatsapp_broadcast_lists ENABLE ROW LEVEL SECURITY;

-- RLS Policies for message_logs
CREATE POLICY "Users can view message logs for their business messages"
  ON message_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE m.id = message_logs.message_id
        AND c.business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    )
  );

-- RLS Policies for marketing_campaigns
CREATE POLICY "Users can view campaigns for their business"
  ON marketing_campaigns FOR SELECT
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can create campaigns for their business"
  ON marketing_campaigns FOR INSERT
  WITH CHECK (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can update campaigns for their business"
  ON marketing_campaigns FOR UPDATE
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can delete campaigns for their business"
  ON marketing_campaigns FOR DELETE
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- RLS Policies for campaign_recipients
CREATE POLICY "Users can view campaign recipients for their business"
  ON campaign_recipients FOR SELECT
  USING (
    campaign_id IN (
      SELECT id FROM marketing_campaigns 
      WHERE business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "System can insert campaign recipients"
  ON campaign_recipients FOR INSERT
  WITH CHECK (true);

CREATE POLICY "System can update campaign recipients"
  ON campaign_recipients FOR UPDATE
  USING (true);

-- RLS Policies for webhook_config
CREATE POLICY "Users can manage webhook config for their business"
  ON webhook_config FOR ALL
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));

-- RLS Policies for whatsapp_broadcast_lists
CREATE POLICY "Users can manage broadcast lists for their business"
  ON whatsapp_broadcast_lists FOR ALL
  USING (business_id IN (SELECT business_id FROM business_users WHERE user_id = auth.uid()));