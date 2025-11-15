-- Normalize all existing phone numbers to E.164 format (+353...)
-- This migration ensures all phone numbers follow the international E.164 standard

-- Update phone numbers in customers table
UPDATE customers 
SET phone = CASE 
  -- Already has + prefix
  WHEN phone ~ '^\+353[0-9]{9}$' THEN phone
  -- Has 353 prefix but no +
  WHEN phone ~ '^353[0-9]{9}$' THEN '+' || phone
  -- Irish local format (starts with 0)
  WHEN phone ~ '^0[0-9]{9}$' THEN '+353' || substring(phone from 2)
  -- 9 digits without prefix
  WHEN phone ~ '^[1-9][0-9]{8}$' THEN '+353' || phone
  -- Has 00353 prefix
  WHEN phone ~ '^00353[0-9]{9}$' THEN '+' || substring(phone from 3)
  -- Keep as-is if doesn't match expected patterns
  ELSE phone
END
WHERE phone IS NOT NULL AND phone != '';

-- Update whatsapp_phone numbers in customers table
UPDATE customers 
SET whatsapp_phone = CASE 
  -- Already has + prefix
  WHEN whatsapp_phone ~ '^\+353[0-9]{9}$' THEN whatsapp_phone
  -- Has 353 prefix but no +
  WHEN whatsapp_phone ~ '^353[0-9]{9}$' THEN '+' || whatsapp_phone
  -- Irish local format (starts with 0)
  WHEN whatsapp_phone ~ '^0[0-9]{9}$' THEN '+353' || substring(whatsapp_phone from 2)
  -- 9 digits without prefix
  WHEN whatsapp_phone ~ '^[1-9][0-9]{8}$' THEN '+353' || whatsapp_phone
  -- Has 00353 prefix
  WHEN whatsapp_phone ~ '^00353[0-9]{9}$' THEN '+' || substring(whatsapp_phone from 3)
  -- Keep as-is if doesn't match expected patterns
  ELSE whatsapp_phone
END
WHERE whatsapp_phone IS NOT NULL AND whatsapp_phone != '';

-- Create a validation trigger function (more flexible than CHECK constraints)
CREATE OR REPLACE FUNCTION validate_phone_e164()
RETURNS TRIGGER AS $$
BEGIN
  -- Validate phone format if provided
  IF NEW.phone IS NOT NULL AND NEW.phone != '' THEN
    IF NEW.phone !~ '^\+353[0-9]{9}$' THEN
      RAISE EXCEPTION 'Phone number must be in E.164 format: +353XXXXXXXXX (e.g., +353858007335)';
    END IF;
  END IF;
  
  -- Validate whatsapp_phone format if provided
  IF NEW.whatsapp_phone IS NOT NULL AND NEW.whatsapp_phone != '' THEN
    IF NEW.whatsapp_phone !~ '^\+353[0-9]{9}$' THEN
      RAISE EXCEPTION 'WhatsApp phone must be in E.164 format: +353XXXXXXXXX (e.g., +353858007335)';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if it exists
DROP TRIGGER IF EXISTS customers_phone_validation ON customers;

-- Create trigger for phone validation
CREATE TRIGGER customers_phone_validation
  BEFORE INSERT OR UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION validate_phone_e164();

-- Create index for efficient phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_whatsapp_phone ON customers(whatsapp_phone);