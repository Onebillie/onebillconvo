-- Fix customers.last_contact_method constraint to support all channels
-- Including 'embed' for website widget sessions

ALTER TABLE customers 
DROP CONSTRAINT IF EXISTS customers_last_contact_method_check;

ALTER TABLE customers 
ADD CONSTRAINT customers_last_contact_method_check 
CHECK (last_contact_method = ANY (ARRAY[
  'whatsapp'::text, 
  'email'::text, 
  'embed'::text, 
  'sms'::text, 
  'facebook'::text, 
  'instagram'::text
]));

-- Add index for better query performance on channel filtering
CREATE INDEX IF NOT EXISTS idx_customers_last_contact_method 
ON customers(last_contact_method);