-- Repair template messages with placeholder content
-- This script reconstructs actual message content from message_templates and template_variables

-- Step 1: Create a temporary function to apply template variables
CREATE OR REPLACE FUNCTION apply_template_variables(template_text TEXT, variables JSONB)
RETURNS TEXT AS $$
DECLARE
  result TEXT;
  var_array TEXT[];
  i INT;
BEGIN
  result := template_text;
  
  -- Handle array format: ["value1", "value2"]
  IF jsonb_typeof(variables) = 'array' THEN
    FOR i IN 0..jsonb_array_length(variables)-1 LOOP
      result := replace(result, '{{' || (i+1)::TEXT || '}}', variables->>i);
    END LOOP;
  -- Handle nested array format: {"variables": ["value1", "value2"]}
  ELSIF variables ? 'variables' AND jsonb_typeof(variables->'variables') = 'array' THEN
    FOR i IN 0..jsonb_array_length(variables->'variables')-1 LOOP
      result := replace(result, '{{' || (i+1)::TEXT || '}}', variables->'variables'->>i);
    END LOOP;
  -- Handle object format: {"1": "value1", "2": "value2"}
  ELSIF jsonb_typeof(variables) = 'object' THEN
    FOR i IN SELECT * FROM jsonb_object_keys(variables) LOOP
      result := replace(result, '{{' || i || '}}', variables->>i);
    END LOOP;
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Update messages with placeholder content where template_name exists
WITH template_repairs AS (
  SELECT 
    m.id,
    mt.content as template_base,
    m.template_variables,
    CASE 
      WHEN m.template_variables IS NOT NULL THEN 
        apply_template_variables(mt.content, m.template_variables)
      ELSE 
        mt.content
    END as repaired_content
  FROM messages m
  INNER JOIN message_templates mt ON m.template_name = mt.name
  WHERE m.business_id = mt.business_id
    AND (
      m.content IS NULL 
      OR m.content LIKE 'Template:%'
      OR m.template_content IS NULL
      OR m.template_content LIKE 'Template:%'
    )
    AND m.template_name IS NOT NULL
    AND m.direction = 'outbound'
)
UPDATE messages m
SET 
  content = tr.repaired_content,
  template_content = tr.repaired_content,
  metadata = COALESCE(m.metadata, '{}'::jsonb) || '{"content_repaired": true}'::jsonb
FROM template_repairs tr
WHERE m.id = tr.id;

-- Step 3: Log the repair operation
DO $$
DECLARE
  repair_count INT;
BEGIN
  GET DIAGNOSTICS repair_count = ROW_COUNT;
  RAISE NOTICE 'Repaired % template messages with reconstructed content', repair_count;
END $$;

-- Step 4: Drop the temporary function (cleanup)
DROP FUNCTION IF EXISTS apply_template_variables(TEXT, JSONB);