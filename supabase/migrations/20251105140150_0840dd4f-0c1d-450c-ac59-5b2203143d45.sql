-- Auto-process OneBill: create trigger on message_attachments to invoke edge function
-- Ensures new message attachments (images/PDFs) are parsed and submitted automatically

-- Drop existing trigger if present to avoid duplicates
DROP TRIGGER IF EXISTS trg_auto_process_onebill ON public.message_attachments;

-- Create trigger to call our trigger function after each new message attachment
CREATE TRIGGER trg_auto_process_onebill
AFTER INSERT ON public.message_attachments
FOR EACH ROW
EXECUTE FUNCTION public.trigger_auto_process_onebill();