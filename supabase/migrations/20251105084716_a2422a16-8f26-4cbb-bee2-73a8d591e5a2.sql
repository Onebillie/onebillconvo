-- Add meter-specific fields to onebill_submissions table
ALTER TABLE public.onebill_submissions 
  ADD COLUMN IF NOT EXISTS utility TEXT CHECK (utility IN ('gas', 'electricity')),
  ADD COLUMN IF NOT EXISTS read_value NUMERIC,
  ADD COLUMN IF NOT EXISTS unit TEXT CHECK (unit IN ('m3', 'kWh')),
  ADD COLUMN IF NOT EXISTS meter_make TEXT,
  ADD COLUMN IF NOT EXISTS meter_model TEXT,
  ADD COLUMN IF NOT EXISTS raw_text TEXT;

-- Create function to trigger auto-process-onebill
CREATE OR REPLACE FUNCTION public.trigger_auto_process_onebill()
RETURNS TRIGGER AS $$
DECLARE
  v_business_id UUID;
BEGIN
  -- Get business_id from conversation
  SELECT c.business_id INTO v_business_id
  FROM conversations c
  JOIN messages m ON m.conversation_id = c.id
  WHERE m.id = NEW.message_id;
  
  -- Only process for OneBillChat business (f47ac10b-58cc-4372-a567-0e02b2c3d479)
  -- and only image/PDF attachments
  IF v_business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'::uuid
     AND (NEW.type ILIKE '%image%' OR NEW.type ILIKE '%pdf%') THEN
    
    -- Call edge function asynchronously using pg_net
    PERFORM net.http_post(
      url := current_setting('app.supabase_url', true) || '/functions/v1/auto-process-onebill',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.supabase_service_role_key', true)
      ),
      body := jsonb_build_object(
        'attachment_id', NEW.id,
        'message_id', NEW.message_id,
        'attachment_url', NEW.url,
        'attachment_type', NEW.type
      )
    );
    
    RAISE NOTICE 'Triggered auto-process-onebill for attachment %', NEW.id;
  END IF;
  
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the attachment insert
    RAISE WARNING 'Error triggering auto-process-onebill: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on message_attachments
DROP TRIGGER IF EXISTS auto_process_onebill_trigger ON public.message_attachments;
CREATE TRIGGER auto_process_onebill_trigger
  AFTER INSERT ON public.message_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_auto_process_onebill();

-- Add comment for documentation
COMMENT ON FUNCTION public.trigger_auto_process_onebill() IS 'Automatically triggers OneBill attachment processing for the OneBillChat business when new image/PDF attachments are received';
