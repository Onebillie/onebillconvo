-- Database trigger to auto-parse inbound attachments
CREATE OR REPLACE FUNCTION trigger_attachment_parse()
RETURNS TRIGGER AS $$
BEGIN
  -- Only process inbound attachments with supported file types
  IF EXISTS (
    SELECT 1 FROM messages m
    WHERE m.id = NEW.message_id
    AND m.direction = 'inbound'
    AND (
      NEW.type LIKE 'image/%' OR 
      NEW.type = 'application/pdf'
    )
  ) THEN
    -- Insert pending parse result (triggers parse-attachment edge function via realtime)
    INSERT INTO attachment_parse_results (
      attachment_id,
      message_id,
      parse_status
    )
    SELECT 
      NEW.id,
      NEW.message_id,
      'pending'
    FROM messages m
    WHERE m.id = NEW.message_id
    ON CONFLICT (attachment_id) DO NOTHING;
    
    -- Log for debugging
    RAISE LOG 'Attachment parse triggered for attachment_id: %, message_id: %', NEW.id, NEW.message_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on message_attachments
DROP TRIGGER IF EXISTS on_attachment_insert ON message_attachments;
CREATE TRIGGER on_attachment_insert
  AFTER INSERT ON message_attachments
  FOR EACH ROW
  EXECUTE FUNCTION trigger_attachment_parse();