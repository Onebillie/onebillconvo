-- Priority 1: Disable duplicate WhatsApp account for hello@alacartesaas.com
UPDATE whatsapp_accounts 
SET is_active = false,
    updated_at = now()
WHERE business_id = 'f98bf02c-80d6-4886-bbe0-0e8248d78c77'
  AND phone_number_id = '440010785865257';

-- Priority 3: Add RLS policies to voice calling tables

-- voice_pricing_config: Admin-only management
ALTER TABLE voice_pricing_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins can manage voice pricing config"
ON voice_pricing_config
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "All users can view voice pricing config"
ON voice_pricing_config
FOR SELECT
TO authenticated
USING (true);

-- voice_call_usage: Business members can view their usage
ALTER TABLE voice_call_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business members can view their voice usage"
ON voice_call_usage
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id FROM business_users WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "System can insert voice usage logs"
ON voice_call_usage
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "System can update voice usage logs"
ON voice_call_usage
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- voice_credit_bundles: Public readable
ALTER TABLE voice_credit_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view voice credit bundles"
ON voice_credit_bundles
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Superadmins can manage voice credit bundles"
ON voice_credit_bundles
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- call_records: Already has RLS but needs review
-- Adding additional policy for system to manage records
CREATE POLICY "System can manage call records"
ON call_records
FOR ALL
TO authenticated
USING (
  is_onebillchat_user() AND (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ) OR has_role(auth.uid(), 'superadmin'::app_role)
  )
)
WITH CHECK (
  is_onebillchat_user() AND (
    business_id IN (
      SELECT business_id FROM business_users WHERE user_id = auth.uid()
    ) OR has_role(auth.uid(), 'superadmin'::app_role)
  )
);

-- call_queues: Already has RLS policy, verified it's correct

-- Add audit log entry for WhatsApp account disabling
INSERT INTO business_audit_log (business_id, action, changed_by, changes)
VALUES (
  'f98bf02c-80d6-4886-bbe0-0e8248d78c77',
  'whatsapp_account_disabled',
  auth.uid(),
  jsonb_build_object(
    'reason', 'Duplicate WhatsApp credentials - security fix',
    'phone_number_id', '440010785865257',
    'timestamp', now()
  )
);