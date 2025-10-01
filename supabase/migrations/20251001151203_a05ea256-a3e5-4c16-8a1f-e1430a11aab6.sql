-- Create api schema
CREATE SCHEMA IF NOT EXISTS api;

-- Create customers table
CREATE TABLE api.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  phone TEXT UNIQUE NOT NULL,
  email TEXT,
  avatar TEXT,
  last_active TIMESTAMP WITH TIME ZONE DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create conversations table
CREATE TABLE api.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID REFERENCES api.customers(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active',
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create messages table
CREATE TABLE api.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES api.conversations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES api.customers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  platform TEXT DEFAULT 'whatsapp',
  external_message_id TEXT,
  thread_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create message_attachments table
CREATE TABLE api.message_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID REFERENCES api.messages(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  url TEXT NOT NULL,
  type TEXT NOT NULL,
  size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create storage bucket for customer bills/attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('customer_bills', 'customer_bills', true)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE api.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.message_attachments ENABLE ROW LEVEL SECURITY;

-- Create policies (allowing all operations for now)
CREATE POLICY "Allow all operations on customers" ON api.customers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" ON api.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON api.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on message_attachments" ON api.message_attachments FOR ALL USING (true) WITH CHECK (true);

-- Storage policies
CREATE POLICY "Allow public read access to customer_bills" ON storage.objects FOR SELECT USING (bucket_id = 'customer_bills');
CREATE POLICY "Allow authenticated uploads to customer_bills" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'customer_bills');

-- Create indexes
CREATE INDEX idx_conversations_customer_id ON api.conversations(customer_id);
CREATE INDEX idx_messages_conversation_id ON api.messages(conversation_id);
CREATE INDEX idx_messages_customer_id ON api.messages(customer_id);
CREATE INDEX idx_message_attachments_message_id ON api.message_attachments(message_id);