-- Add incremental sync columns to email_accounts
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS last_imap_uid bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_imap_uidvalidity bigint DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_synced_at timestamp with time zone;

-- Add diagnostics column to email_sync_logs
ALTER TABLE public.email_sync_logs
ADD COLUMN IF NOT EXISTS diagnostics jsonb;

-- Create storage bucket for email attachments (using customer_media bucket)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('customer_media', 'customer_media', true, 52428800, NULL)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for customer_media bucket
CREATE POLICY "Authenticated users can upload to customer_media"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'customer_media');

CREATE POLICY "Authenticated users can view customer_media"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'customer_media');

CREATE POLICY "Authenticated users can delete from customer_media"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'customer_media');