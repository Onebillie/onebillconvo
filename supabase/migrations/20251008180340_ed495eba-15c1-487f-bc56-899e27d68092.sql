-- Add POP3 support and inbound method selection to email_accounts
ALTER TABLE public.email_accounts 
ADD COLUMN IF NOT EXISTS pop3_host text,
ADD COLUMN IF NOT EXISTS pop3_port integer DEFAULT 995,
ADD COLUMN IF NOT EXISTS pop3_use_ssl boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS pop3_username text,
ADD COLUMN IF NOT EXISTS pop3_password text,
ADD COLUMN IF NOT EXISTS inbound_method text DEFAULT 'imap' CHECK (inbound_method IN ('imap', 'pop3')),
ADD COLUMN IF NOT EXISTS last_pop3_uidl text;

-- Add smtp_test and new operation types to allowed operation types in email_operation_logs
-- Include existing types: sync_start, account_test
ALTER TABLE public.email_operation_logs 
DROP CONSTRAINT IF EXISTS email_operation_logs_operation_type_check;

ALTER TABLE public.email_operation_logs
ADD CONSTRAINT email_operation_logs_operation_type_check 
CHECK (operation_type IN ('sync', 'send', 'imap_test', 'smtp_test', 'pop3_sync', 'resend_send', 'sync_start', 'account_test'));

-- Add index for faster UIDL lookups
CREATE INDEX IF NOT EXISTS idx_email_accounts_last_pop3_uidl ON public.email_accounts(last_pop3_uidl);

-- Comment on new columns
COMMENT ON COLUMN public.email_accounts.inbound_method IS 'Email retrieval method: imap or pop3';
COMMENT ON COLUMN public.email_accounts.last_pop3_uidl IS 'Last processed POP3 UIDL for incremental sync';