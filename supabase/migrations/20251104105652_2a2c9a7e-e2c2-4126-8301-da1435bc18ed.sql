-- Add CRM integration fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(business_id, external_id);

-- Add message webhook configuration to business_settings
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS message_webhook_url TEXT;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS message_webhook_enabled BOOLEAN DEFAULT false;
ALTER TABLE business_settings ADD COLUMN IF NOT EXISTS message_webhook_secret TEXT;

-- Create function to send message webhooks
CREATE OR REPLACE FUNCTION public.trigger_message_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  _business_id uuid;
  _webhook_enabled boolean;
BEGIN
  -- Get business_id from conversation
  SELECT c.business_id INTO _business_id
  FROM conversations c
  WHERE c.id = NEW.conversation_id;
  
  -- Check if webhooks are enabled for this business
  SELECT bs.message_webhook_enabled INTO _webhook_enabled
  FROM business_settings bs
  WHERE bs.business_id = _business_id;
  
  -- Only trigger webhook for inbound messages if enabled
  IF _webhook_enabled AND NEW.direction = 'inbound' THEN
    -- Call webhook function asynchronously (fire and forget)
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/webhook-send-message',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.service_role_key')
      ),
      body := jsonb_build_object(
        'message_id', NEW.id,
        'business_id', _business_id
      )
    );
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the message insert
    RAISE WARNING 'Error triggering message webhook: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger on messages table
DROP TRIGGER IF EXISTS trg_message_webhook ON messages;
CREATE TRIGGER trg_message_webhook
  AFTER INSERT ON messages
  FOR EACH ROW
  EXECUTE FUNCTION trigger_message_webhook();