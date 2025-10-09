-- Add subject column to messages table for email subject lines
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS subject TEXT;