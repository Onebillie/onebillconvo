-- Add CRM integration fields to customers table
ALTER TABLE customers 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_system TEXT,
ADD COLUMN IF NOT EXISTS sync_enabled BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS last_synced_at TIMESTAMP WITH TIME ZONE;

-- Create indexes for external ID lookups
CREATE INDEX IF NOT EXISTS idx_customers_external_id ON customers(external_id, external_system);
CREATE INDEX IF NOT EXISTS idx_customers_business_external ON customers(business_id, external_id);