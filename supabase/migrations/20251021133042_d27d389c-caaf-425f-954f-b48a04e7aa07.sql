-- Add enterprise account management fields to businesses table
ALTER TABLE businesses
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe' CHECK (payment_method IN ('stripe', 'bank')),
ADD COLUMN IF NOT EXISTS custom_price_monthly numeric DEFAULT NULL,
ADD COLUMN IF NOT EXISTS invoice_email text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'overdue', 'cancelled')),
ADD COLUMN IF NOT EXISTS last_payment_date timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS next_payment_due timestamp with time zone DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enterprise_notes text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS custom_features jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS is_enterprise boolean DEFAULT false;

-- Create enterprise invoices table
CREATE TABLE IF NOT EXISTS enterprise_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_number text NOT NULL UNIQUE,
  amount numeric NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  payment_method text NOT NULL CHECK (payment_method IN ('stripe', 'bank')),
  stripe_invoice_id text DEFAULT NULL,
  due_date timestamp with time zone NOT NULL,
  paid_date timestamp with time zone DEFAULT NULL,
  notes text DEFAULT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on enterprise_invoices
ALTER TABLE enterprise_invoices ENABLE ROW LEVEL SECURITY;

-- Superadmins can manage all invoices
CREATE POLICY "Superadmins can manage enterprise invoices"
ON enterprise_invoices
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role));

-- Business members can view their invoices
CREATE POLICY "Business members can view their invoices"
ON enterprise_invoices
FOR SELECT
USING (user_belongs_to_business(auth.uid(), business_id));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_enterprise_invoices_business_id ON enterprise_invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_enterprise_invoices_status ON enterprise_invoices(status);

COMMENT ON TABLE enterprise_invoices IS 'Tracks invoices for enterprise customers with custom pricing';