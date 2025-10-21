-- Create granular permissions table
CREATE TABLE IF NOT EXISTS public.granular_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user granular permissions junction table
CREATE TABLE IF NOT EXISTS public.user_granular_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  permission_name TEXT NOT NULL,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, permission_name, business_id)
);

-- Enable RLS
ALTER TABLE public.granular_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_granular_permissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for granular_permissions
CREATE POLICY "Anyone can view granular permissions"
  ON public.granular_permissions
  FOR SELECT
  USING (true);

CREATE POLICY "Superadmins can manage granular permissions"
  ON public.granular_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- RLS Policies for user_granular_permissions
CREATE POLICY "Users can view their own permissions"
  ON public.user_granular_permissions
  FOR SELECT
  USING (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Superadmins can manage user permissions"
  ON public.user_granular_permissions
  FOR ALL
  USING (has_role(auth.uid(), 'superadmin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Insert default granular permissions
INSERT INTO public.granular_permissions (name, category, description) VALUES
  -- Templates
  ('templates.view', 'Templates', 'View message templates'),
  ('templates.create', 'Templates', 'Create new templates'),
  ('templates.edit', 'Templates', 'Edit existing templates'),
  ('templates.delete', 'Templates', 'Delete templates'),
  
  -- Conversations
  ('conversations.view', 'Conversations', 'View conversations'),
  ('conversations.assign', 'Conversations', 'Assign conversations to team members'),
  ('conversations.transfer', 'Conversations', 'Transfer conversations'),
  ('conversations.delete', 'Conversations', 'Delete conversations'),
  ('conversations.export', 'Conversations', 'Export conversation data'),
  
  -- Users/Staff
  ('users.invite', 'Users', 'Invite new team members'),
  ('users.edit', 'Users', 'Edit team member details'),
  ('users.deactivate', 'Users', 'Deactivate team members'),
  ('users.delete', 'Users', 'Delete team members'),
  
  -- Billing
  ('billing.view', 'Billing', 'View billing information'),
  ('billing.manage', 'Billing', 'Manage subscriptions and payments'),
  ('billing.cancel', 'Billing', 'Cancel subscription'),
  
  -- Settings
  ('settings.view', 'Settings', 'View business settings'),
  ('settings.edit', 'Settings', 'Edit business settings'),
  ('settings.channels', 'Settings', 'Manage communication channels'),
  
  -- Customers
  ('customers.view', 'Customers', 'View customer information'),
  ('customers.create', 'Customers', 'Create new customers'),
  ('customers.edit', 'Customers', 'Edit customer details'),
  ('customers.delete', 'Customers', 'Delete customers'),
  
  -- Tasks
  ('tasks.view', 'Tasks', 'View tasks'),
  ('tasks.create', 'Tasks', 'Create new tasks'),
  ('tasks.edit', 'Tasks', 'Edit tasks'),
  ('tasks.delete', 'Tasks', 'Delete tasks'),
  
  -- Reports
  ('reports.view', 'Reports', 'View reports and analytics'),
  ('reports.export', 'Reports', 'Export reports'),
  
  -- API
  ('api.manage', 'API', 'Manage API keys and webhooks')
ON CONFLICT (name) DO NOTHING;