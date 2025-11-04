-- Create OneBill submissions tracking table
CREATE TABLE public.onebill_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('meter', 'electricity', 'gas')),
  classification_confidence NUMERIC(3,2) CHECK (classification_confidence >= 0 AND classification_confidence <= 1),
  extracted_fields JSONB NOT NULL DEFAULT '{}'::jsonb,
  phone TEXT NOT NULL,
  mprn TEXT,
  gprn TEXT,
  mcc_type TEXT,
  dg_type TEXT,
  url TEXT,
  onebill_endpoint TEXT NOT NULL,
  http_status INTEGER,
  onebill_response JSONB,
  submission_status TEXT NOT NULL DEFAULT 'pending' CHECK (submission_status IN ('pending', 'success', 'failed', 'retrying')),
  retry_count INTEGER NOT NULL DEFAULT 0,
  error_message TEXT,
  submitted_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create OneBill tenant configuration table
CREATE TABLE public.onebill_tenant_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  default_country_code TEXT NOT NULL DEFAULT '+353',
  auto_classify BOOLEAN NOT NULL DEFAULT true,
  require_user_confirmation BOOLEAN NOT NULL DEFAULT true,
  webhook_url TEXT,
  webhook_secret TEXT,
  webhook_enabled BOOLEAN NOT NULL DEFAULT false,
  ocr_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.70 CHECK (ocr_confidence_threshold >= 0.5 AND ocr_confidence_threshold <= 1),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.onebill_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onebill_tenant_config ENABLE ROW LEVEL SECURITY;

-- RLS Policies for onebill_submissions
CREATE POLICY "Users can view their business OneBill submissions"
  ON public.onebill_submissions
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create OneBill submissions for their business"
  ON public.onebill_submissions
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "System can update OneBill submissions"
  ON public.onebill_submissions
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- RLS Policies for onebill_tenant_config
CREATE POLICY "Users can view their business OneBill config"
  ON public.onebill_tenant_config
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Business admins can manage OneBill config"
  ON public.onebill_tenant_config
  FOR ALL
  USING (
    business_id IN (
      SELECT bu.business_id 
      FROM public.business_users bu
      WHERE bu.user_id = auth.uid() 
      AND bu.role IN ('owner', 'admin')
    )
  );

-- Create indexes for better query performance
CREATE INDEX idx_onebill_submissions_business_id ON public.onebill_submissions(business_id);
CREATE INDEX idx_onebill_submissions_customer_id ON public.onebill_submissions(customer_id);
CREATE INDEX idx_onebill_submissions_document_type ON public.onebill_submissions(document_type);
CREATE INDEX idx_onebill_submissions_status ON public.onebill_submissions(submission_status);
CREATE INDEX idx_onebill_submissions_submitted_at ON public.onebill_submissions(submitted_at DESC);

-- Create updated_at trigger for onebill_submissions
CREATE TRIGGER update_onebill_submissions_updated_at
  BEFORE UPDATE ON public.onebill_submissions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for onebill_tenant_config
CREATE TRIGGER update_onebill_tenant_config_updated_at
  BEFORE UPDATE ON public.onebill_tenant_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();