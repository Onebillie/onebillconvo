-- Add notes field to customers table for private notes
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Create index for better performance on notes searches
CREATE INDEX IF NOT EXISTS idx_customers_notes ON public.customers USING gin(to_tsvector('english', notes));

-- Add metadata field for additional customer information
ALTER TABLE public.customers 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;