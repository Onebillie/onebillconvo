-- Disable the auto-trigger that causes flickering
DROP TRIGGER IF EXISTS on_attachment_insert ON message_attachments;
DROP FUNCTION IF EXISTS trigger_attachment_parse();