-- Repair historical template messages with placeholder content
-- Updates messages.content and messages.template_content with actual template body

UPDATE messages m
SET 
  content = t.content,
  template_content = t.content,
  metadata = jsonb_set(
    COALESCE(m.metadata, '{}'::jsonb),
    '{content_repaired}',
    'true'
  )
FROM message_templates t
WHERE m.template_name IS NOT NULL
  AND m.template_name = t.name
  AND m.business_id = t.business_id
  AND (
    m.content ILIKE 'Template:%' 
    OR m.template_content ILIKE 'Template:%'
    OR m.content IS NULL
    OR m.content = ''
  );