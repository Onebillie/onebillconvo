-- Drop OneBill submissions table
DROP TABLE IF EXISTS public.onebill_submissions CASCADE;

-- Drop any OneBill-related triggers
DROP TRIGGER IF EXISTS trigger_auto_process_onebill ON public.message_attachments;
DROP FUNCTION IF EXISTS public.trigger_auto_process_onebill() CASCADE;