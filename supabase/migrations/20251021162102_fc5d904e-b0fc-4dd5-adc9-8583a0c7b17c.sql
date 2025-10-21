-- Knowledge Base Documents with File Support
CREATE TABLE IF NOT EXISTS public.ai_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  file_name TEXT,
  file_path TEXT,
  file_size INTEGER,
  file_type TEXT,
  chunk_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Document Chunks for RAG
CREATE TABLE IF NOT EXISTS public.ai_document_chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.ai_knowledge_documents(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  chunk_text TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Privacy & Compliance Settings
CREATE TABLE IF NOT EXISTS public.ai_privacy_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL UNIQUE REFERENCES public.businesses(id) ON DELETE CASCADE,
  closed_dataset_mode BOOLEAN DEFAULT false,
  require_high_confidence BOOLEAN DEFAULT true,
  confidence_threshold DECIMAL(3,2) DEFAULT 0.75,
  anonymize_training_data BOOLEAN DEFAULT false,
  data_retention_days INTEGER DEFAULT 90,
  mask_pii BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Per-Customer AI Context (isolated conversation history)
CREATE TABLE IF NOT EXISTS public.ai_customer_context (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  context_summary TEXT,
  sentiment TEXT CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  last_interaction TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_id, customer_id)
);

-- Response Quality Tracking
CREATE TABLE IF NOT EXISTS public.ai_response_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  prompt TEXT NOT NULL,
  response TEXT NOT NULL,
  confidence_score DECIMAL(3,2),
  sources_used JSONB DEFAULT '[]'::jsonb,
  was_approved BOOLEAN,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feedback_rating INTEGER CHECK (feedback_rating >= 1 AND feedback_rating <= 5),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_knowledge_docs_business ON public.ai_knowledge_documents(business_id, is_active);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_document ON public.ai_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_doc_chunks_business ON public.ai_document_chunks(business_id);
CREATE INDEX IF NOT EXISTS idx_customer_context_business ON public.ai_customer_context(business_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_response_logs_business ON public.ai_response_logs(business_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_knowledge_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_privacy_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_customer_context ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_response_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage their business knowledge docs"
  ON public.ai_knowledge_documents
  FOR ALL
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their business document chunks"
  ON public.ai_document_chunks
  FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can manage their business privacy settings"
  ON public.ai_privacy_settings
  FOR ALL
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their business customer context"
  ON public.ai_customer_context
  FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

CREATE POLICY "Users can view their business response logs"
  ON public.ai_response_logs
  FOR SELECT
  USING (business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid()));

-- Storage bucket for AI documents
INSERT INTO storage.buckets (id, name, public)
VALUES ('ai-knowledge-base', 'ai-knowledge-base', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Users can upload to their business knowledge base"
  ON storage.objects
  FOR INSERT
  WITH CHECK (
    bucket_id = 'ai-knowledge-base' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their business knowledge base files"
  ON storage.objects
  FOR SELECT
  USING (
    bucket_id = 'ai-knowledge-base' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business knowledge base files"
  ON storage.objects
  FOR DELETE
  USING (
    bucket_id = 'ai-knowledge-base' AND
    (storage.foldername(name))[1] IN (
      SELECT business_id::text FROM public.business_users WHERE user_id = auth.uid()
    )
  );