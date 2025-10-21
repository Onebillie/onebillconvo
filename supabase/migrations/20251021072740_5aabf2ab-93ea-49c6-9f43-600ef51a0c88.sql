-- Add missing columns to embed_customizations table
ALTER TABLE embed_customizations 
ADD COLUMN IF NOT EXISTS chat_icon_type text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS widget_position text DEFAULT 'bottom-right',
ADD COLUMN IF NOT EXISTS greeting_message text DEFAULT 'Hello! How can we help you today?',
ADD COLUMN IF NOT EXISTS offline_message text DEFAULT 'We''re currently offline. Leave a message!';

-- Add RLS policies for embed tables
ALTER TABLE embed_customizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_sites ENABLE ROW LEVEL SECURITY;
ALTER TABLE embed_ai_settings ENABLE ROW LEVEL SECURITY;

-- embed_customizations policies
CREATE POLICY "Business members can view their customizations"
ON embed_customizations FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage customizations"
ON embed_customizations FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- embed_sites policies
CREATE POLICY "Business members can view their sites"
ON embed_sites FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage sites"
ON embed_sites FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- embed_ai_settings policies
CREATE POLICY "Business members can view their AI settings"
ON embed_ai_settings FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Business admins can manage AI settings"
ON embed_ai_settings FOR ALL
USING (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT bu.business_id FROM business_users bu 
    WHERE bu.user_id = auth.uid() AND bu.role IN ('owner', 'admin')
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);