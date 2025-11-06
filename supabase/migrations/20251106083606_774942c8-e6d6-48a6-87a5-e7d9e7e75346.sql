-- Add parsed data columns to message_attachments table
ALTER TABLE public.message_attachments 
  ADD COLUMN IF NOT EXISTS parsed_data JSONB,
  ADD COLUMN IF NOT EXISTS parsed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS parse_status TEXT CHECK (parse_status IS NULL OR parse_status IN ('pending', 'success', 'failed', 'none'));

-- Create index for parse_status
CREATE INDEX IF NOT EXISTS idx_message_attachments_parse_status 
  ON public.message_attachments(parse_status);

-- Update trigger function to call generic auto-parse for all businesses
CREATE OR REPLACE FUNCTION public.trigger_auto_parse_attachment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_business_id UUID;
BEGIN
  SELECT c.business_id INTO v_business_id
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  WHERE m.id = NEW.message_id;
  
  IF (NEW.type ILIKE '%image%' OR NEW.type ILIKE '%pdf%') THEN
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/auto-parse-attachment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'attachment_id', NEW.id,
        'message_id', NEW.message_id,
        'attachment_url', NEW.url,
        'attachment_type', NEW.type,
        'business_id', v_business_id
      )
    );
    
    RAISE NOTICE 'Triggered auto-parse-attachment for attachment %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error triggering auto-parse-attachment: %', SQLERRM;
    RETURN NEW;
END;
$function$;

-- Replace trigger
DROP TRIGGER IF EXISTS trg_auto_process_onebill ON public.message_attachments;
DROP TRIGGER IF EXISTS trg_auto_parse_attachment ON public.message_attachments;

CREATE TRIGGER trg_auto_parse_attachment
AFTER INSERT ON public.message_attachments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_parse_attachment();