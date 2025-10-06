-- Add whatsapp_name field to customers table to preserve WhatsApp contact name separately
ALTER TABLE public.customers 
ADD COLUMN whatsapp_name TEXT,
ADD COLUMN first_name TEXT,
ADD COLUMN last_name TEXT;

-- Update existing customers to populate first_name from name field
UPDATE public.customers 
SET first_name = SPLIT_PART(name, ' ', 1),
    last_name = CASE 
      WHEN name LIKE '% %' THEN SUBSTRING(name FROM POSITION(' ' IN name) + 1)
      ELSE NULL
    END
WHERE first_name IS NULL;