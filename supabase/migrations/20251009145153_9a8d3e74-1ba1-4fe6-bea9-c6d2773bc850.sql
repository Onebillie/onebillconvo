-- Phase 5: Add grace period for account freezing
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS grace_period_end timestamptz;

-- Phase 7: Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  stripe_invoice_id text NOT NULL UNIQUE,
  amount_due integer NOT NULL,
  amount_paid integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  status text NOT NULL,
  invoice_pdf text,
  hosted_invoice_url text,
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Business members can view their invoices"
  ON invoices FOR SELECT
  USING (user_belongs_to_business(auth.uid(), business_id) OR has_role(auth.uid(), 'superadmin'::app_role));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_stripe_id ON invoices(stripe_invoice_id);

-- Add trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();