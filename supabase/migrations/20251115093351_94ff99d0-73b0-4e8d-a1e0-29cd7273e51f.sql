-- Add call_record_id to messages table
ALTER TABLE messages 
ADD COLUMN IF NOT EXISTS call_record_id UUID REFERENCES call_records(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_messages_call_record_id 
ON messages(call_record_id);

-- Create function to auto-create message for completed calls
CREATE OR REPLACE FUNCTION create_call_message()
RETURNS TRIGGER AS $$
DECLARE
  v_customer_id UUID;
  v_conversation_id UUID;
  v_content TEXT;
  v_normalized_from TEXT;
  v_normalized_to TEXT;
BEGIN
  -- Only create message when call is completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Normalize phone numbers
    v_normalized_from := regexp_replace(regexp_replace(NEW.from_number, '^\+', ''), '^00', '');
    v_normalized_to := regexp_replace(regexp_replace(NEW.to_number, '^\+', ''), '^00', '');
    
    -- Find customer by phone number (try both from/to)
    SELECT id INTO v_customer_id
    FROM customers
    WHERE phone = v_normalized_from
       OR phone = v_normalized_to
       OR whatsapp_phone = v_normalized_from
       OR whatsapp_phone = v_normalized_to
    LIMIT 1;

    IF v_customer_id IS NOT NULL THEN
      -- Get or create active conversation
      SELECT id INTO v_conversation_id
      FROM conversations
      WHERE customer_id = v_customer_id
        AND business_id = NEW.business_id
        AND status = 'active'
      LIMIT 1;

      IF v_conversation_id IS NULL THEN
        INSERT INTO conversations (customer_id, business_id, status, platform)
        VALUES (v_customer_id, NEW.business_id, 'active', 'call')
        RETURNING id INTO v_conversation_id;
      END IF;

      -- Build message content
      v_content := CASE 
        WHEN NEW.direction = 'inbound' THEN 
          '📞 Incoming call' || CASE WHEN NEW.duration_seconds > 0 
            THEN ' (' || ROUND(NEW.duration_seconds / 60.0, 1)::text || ' min)' 
            ELSE ' (missed)' END
        ELSE 
          '📞 Outgoing call' || CASE WHEN NEW.duration_seconds > 0 
            THEN ' (' || ROUND(NEW.duration_seconds / 60.0, 1)::text || ' min)' 
            ELSE ' (not answered)' END
      END;

      -- Create message (avoid duplicates)
      INSERT INTO messages (
        customer_id,
        conversation_id,
        content,
        direction,
        platform,
        call_record_id,
        created_at,
        is_read
      ) VALUES (
        v_customer_id,
        v_conversation_id,
        v_content,
        NEW.direction,
        'call',
        NEW.id,
        NEW.started_at,
        NEW.direction = 'outbound' -- Outbound calls are pre-marked as read
      )
      ON CONFLICT DO NOTHING;

      RAISE NOTICE 'Created call message for call_record %', NEW.id;
    ELSE
      RAISE NOTICE 'No customer found for call % with numbers % and %', 
        NEW.id, NEW.from_number, NEW.to_number;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger
DROP TRIGGER IF EXISTS trigger_create_call_message ON call_records;
CREATE TRIGGER trigger_create_call_message
AFTER INSERT OR UPDATE ON call_records
FOR EACH ROW
EXECUTE FUNCTION create_call_message();