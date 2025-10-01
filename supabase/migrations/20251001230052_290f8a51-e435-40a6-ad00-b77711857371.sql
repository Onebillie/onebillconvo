-- Create AI assistant configuration table
CREATE TABLE IF NOT EXISTS public.ai_assistant_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_enabled boolean DEFAULT false,
  out_of_hours_only boolean DEFAULT true,
  business_hours_start time DEFAULT '09:00:00',
  business_hours_end time DEFAULT '17:00:00',
  model text DEFAULT 'google/gemini-2.5-flash',
  temperature real DEFAULT 0.7,
  max_tokens integer DEFAULT 500,
  system_prompt text DEFAULT 'You are a helpful customer service assistant. Answer questions based on the provided information. If you cannot answer, politely suggest waiting for a staff member.',
  updated_at timestamp with time zone DEFAULT now()
);

-- Create AI training data table for custom Q&A pairs
CREATE TABLE IF NOT EXISTS public.ai_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  category text,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create AI RAG documents table
CREATE TABLE IF NOT EXISTS public.ai_rag_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  document_type text DEFAULT 'faq',
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create conversation-level AI settings
CREATE TABLE IF NOT EXISTS public.conversation_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES public.conversations(id) ON DELETE CASCADE,
  ai_enabled boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(conversation_id)
);

-- Enable RLS
ALTER TABLE public.ai_assistant_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_training_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversation_ai_settings ENABLE ROW LEVEL SECURITY;

-- Policies for ai_assistant_config
CREATE POLICY "Admins can manage AI config"
ON public.ai_assistant_config
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view AI config"
ON public.ai_assistant_config
FOR SELECT
USING (true);

-- Policies for ai_training_data
CREATE POLICY "Admins can manage training data"
ON public.ai_training_data
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view training data"
ON public.ai_training_data
FOR SELECT
USING (true);

-- Policies for ai_rag_documents
CREATE POLICY "Admins can manage RAG documents"
ON public.ai_rag_documents
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'superadmin'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated users can view RAG documents"
ON public.ai_rag_documents
FOR SELECT
USING (true);

-- Policies for conversation_ai_settings
CREATE POLICY "Authenticated users can manage conversation AI settings"
ON public.conversation_ai_settings
FOR ALL
USING (true)
WITH CHECK (true);

-- Insert default config
INSERT INTO public.ai_assistant_config (is_enabled) VALUES (false) ON CONFLICT DO NOTHING;