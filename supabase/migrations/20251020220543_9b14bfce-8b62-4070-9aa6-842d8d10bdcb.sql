-- Create teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  department TEXT,
  color TEXT DEFAULT '#3b82f6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id)
);

-- Create permissions table
CREATE TABLE IF NOT EXISTS public.permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create role_permissions table
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE NOT NULL,
  granted_by UUID REFERENCES public.profiles(id),
  granted_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, user_id, permission_id)
);

-- Create internal_messages table
CREATE TABLE IF NOT EXISTS public.internal_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  priority TEXT DEFAULT 'normal',
  related_conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  related_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_by_sender BOOLEAN DEFAULT false,
  deleted_by_recipient BOOLEAN DEFAULT false
);

-- Create internal_message_attachments table
CREATE TABLE IF NOT EXISTS public.internal_message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES public.internal_messages(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create conversation_transfers table
CREATE TABLE IF NOT EXISTS public.conversation_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  reason TEXT,
  notes TEXT,
  transferred_at TIMESTAMPTZ DEFAULT now()
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS public.notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  inapp_new_message BOOLEAN DEFAULT true,
  inapp_assignment BOOLEAN DEFAULT true,
  inapp_transfer BOOLEAN DEFAULT true,
  inapp_team_message BOOLEAN DEFAULT true,
  inapp_mention BOOLEAN DEFAULT true,
  email_new_message BOOLEAN DEFAULT false,
  email_assignment BOOLEAN DEFAULT true,
  email_transfer BOOLEAN DEFAULT true,
  email_team_message BOOLEAN DEFAULT true,
  email_daily_summary BOOLEAN DEFAULT true,
  push_new_message BOOLEAN DEFAULT true,
  push_assignment BOOLEAN DEFAULT true,
  push_urgent_only BOOLEAN DEFAULT false,
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00',
  quiet_hours_end TIME DEFAULT '08:00',
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add transfer fields to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS transfer_reason TEXT,
ADD COLUMN IF NOT EXISTS transferred_from UUID REFERENCES public.profiles(id),
ADD COLUMN IF NOT EXISTS transferred_at TIMESTAMPTZ;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teams_business ON public.teams(business_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_user ON public.role_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_role_permissions_permission ON public.role_permissions(permission_id);
CREATE INDEX IF NOT EXISTS idx_internal_messages_recipient ON public.internal_messages(recipient_id, is_read);
CREATE INDEX IF NOT EXISTS idx_internal_messages_sender ON public.internal_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_conversation_transfers_conversation ON public.conversation_transfers(conversation_id);

-- Seed default permissions
INSERT INTO public.permissions (name, category, description) VALUES
('manage_templates', 'templates', 'Create, edit, and delete message templates'),
('use_templates', 'templates', 'Use existing templates in conversations'),
('view_business_settings', 'settings', 'View business configuration'),
('edit_business_settings', 'settings', 'Modify business settings'),
('manage_channels', 'settings', 'Configure WhatsApp, Email, SMS channels'),
('view_api_keys', 'settings', 'View API keys and tokens'),
('manage_api_keys', 'settings', 'Create and revoke API keys'),
('manage_staff', 'staff', 'Add, edit, and remove team members'),
('manage_teams', 'staff', 'Create and manage teams/departments'),
('view_all_conversations', 'conversations', 'View all business conversations'),
('assign_conversations', 'conversations', 'Assign conversations to team members'),
('view_billing', 'billing', 'View subscription and billing information'),
('manage_billing', 'billing', 'Update payment methods and subscriptions')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internal_message_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for teams
CREATE POLICY "Business members can view teams" ON public.teams
  FOR SELECT USING (
    user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Business admins can manage teams" ON public.teams
  FOR ALL USING (
    (business_id IN (
      SELECT bu.business_id FROM public.business_users bu 
      WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
    )) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- RLS Policies for permissions
CREATE POLICY "Everyone can view permissions" ON public.permissions
  FOR SELECT TO authenticated USING (true);

-- RLS Policies for role_permissions
CREATE POLICY "Users can view their permissions" ON public.role_permissions
  FOR SELECT USING (
    user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Business admins can manage permissions" ON public.role_permissions
  FOR ALL USING (
    (business_id IN (
      SELECT bu.business_id FROM public.business_users bu 
      WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
    )) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

-- RLS Policies for internal_messages
CREATE POLICY "Users can view their messages" ON public.internal_messages
  FOR SELECT USING (
    sender_id = auth.uid() OR recipient_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Users can send messages" ON public.internal_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
  );

CREATE POLICY "Users can update their messages" ON public.internal_messages
  FOR UPDATE USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

CREATE POLICY "Users can delete their messages" ON public.internal_messages
  FOR DELETE USING (
    sender_id = auth.uid() OR recipient_id = auth.uid()
  );

-- RLS Policies for internal_message_attachments
CREATE POLICY "Users can view attachments of their messages" ON public.internal_message_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.internal_messages im 
      WHERE im.id = message_id 
      AND (im.sender_id = auth.uid() OR im.recipient_id = auth.uid())
    )
  );

CREATE POLICY "Users can insert attachments to their messages" ON public.internal_message_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internal_messages im 
      WHERE im.id = message_id AND im.sender_id = auth.uid()
    )
  );

-- RLS Policies for conversation_transfers
CREATE POLICY "Business members can view transfers" ON public.conversation_transfers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND user_belongs_to_business(auth.uid(), c.business_id)
    ) OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Business members can create transfers" ON public.conversation_transfers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c 
      WHERE c.id = conversation_id 
      AND user_belongs_to_business(auth.uid(), c.business_id)
    )
  );

-- RLS Policies for notification_preferences
CREATE POLICY "Users can view their notification preferences" ON public.notification_preferences
  FOR SELECT USING (
    user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role)
  );

CREATE POLICY "Users can manage their notification preferences" ON public.notification_preferences
  FOR ALL USING (
    user_id = auth.uid()
  );