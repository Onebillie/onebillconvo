-- Drop the existing check constraint
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_status_check;

-- Add the updated check constraint with 'pending' status
ALTER TABLE public.messages ADD CONSTRAINT messages_status_check 
  CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'read', 'failed'));