-- Create attachment_parse_results table for unified parsing
CREATE TABLE IF NOT EXISTS attachment_parse_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attachment_id UUID NOT NULL UNIQUE REFERENCES message_attachments(id) ON DELETE CASCADE,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  
  -- Parse status
  parse_status TEXT NOT NULL DEFAULT 'pending' CHECK (parse_status IN ('pending', 'processing', 'completed', 'failed')),
  parse_error TEXT,
  
  -- Classification results
  document_type TEXT CHECK (document_type IN ('meter', 'electricity', 'gas', 'invoice', 'receipt', 'id_card', 'other')),
  classification_confidence DECIMAL,
  
  -- Extracted data (JSON)
  extracted_fields JSONB DEFAULT '{}'::jsonb,
  field_confidence JSONB DEFAULT '{}'::jsonb,
  low_confidence_fields TEXT[],
  
  -- AI provider tracking
  ai_provider TEXT, -- 'openai', 'lovable_ai'
  ai_model TEXT, -- 'gpt-4o', 'gemini-2.5-flash', etc.
  tokens_used INTEGER,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  parsed_at TIMESTAMPTZ
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_attachment_id ON attachment_parse_results(attachment_id);
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_message_id ON attachment_parse_results(message_id);
CREATE INDEX IF NOT EXISTS idx_attachment_parse_results_status ON attachment_parse_results(parse_status);

-- Enable RLS
ALTER TABLE attachment_parse_results ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view parse results for their business messages
CREATE POLICY "Users can view parse results for their business"
  ON attachment_parse_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM messages m
      INNER JOIN business_users bu ON m.business_id = bu.business_id
      WHERE m.id = attachment_parse_results.message_id
      AND bu.user_id = auth.uid()
    )
  );

-- Policy: Service role can manage all parse results
CREATE POLICY "Service role can manage parse results"
  ON attachment_parse_results
  FOR ALL
  USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text)
  WITH CHECK ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create function to update updated_at
CREATE OR REPLACE FUNCTION update_attachment_parse_results_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER set_attachment_parse_results_updated_at
  BEFORE UPDATE ON attachment_parse_results
  FOR EACH ROW
  EXECUTE FUNCTION update_attachment_parse_results_updated_at();

-- Enable realtime for attachment_parse_results
ALTER PUBLICATION supabase_realtime ADD TABLE attachment_parse_results;