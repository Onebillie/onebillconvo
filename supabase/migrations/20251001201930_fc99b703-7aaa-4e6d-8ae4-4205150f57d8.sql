-- Merge duplicate conversations per customer and consolidate messages
BEGIN;

-- Step 1: Create temp table to identify canonical and duplicate conversations
CREATE TEMP TABLE conversation_mapping AS
WITH customer_conversations AS (
  SELECT 
    c.customer_id,
    c.id as conversation_id,
    c.created_at,
    c.updated_at,
    c.last_message_at,
    COUNT(m.id) as message_count,
    ROW_NUMBER() OVER (
      PARTITION BY c.customer_id 
      ORDER BY c.last_message_at DESC NULLS LAST, c.updated_at DESC, COUNT(m.id) DESC, c.created_at DESC
    ) as rn
  FROM public.conversations c
  LEFT JOIN public.messages m ON m.conversation_id = c.id
  GROUP BY c.id, c.customer_id, c.created_at, c.updated_at, c.last_message_at
),
canonical_conversations AS (
  SELECT customer_id, conversation_id as canonical_id
  FROM customer_conversations
  WHERE rn = 1
)
SELECT 
  cc.customer_id,
  cc.conversation_id as duplicate_id,
  canon.canonical_id,
  cc.rn
FROM customer_conversations cc
JOIN canonical_conversations canon ON cc.customer_id = canon.customer_id;

-- Step 2: Move all messages from duplicate conversations to canonical conversation
UPDATE public.messages m
SET conversation_id = cm.canonical_id
FROM conversation_mapping cm
WHERE m.conversation_id = cm.duplicate_id AND cm.rn > 1;

-- Step 3: Move any conversation notes from duplicate to canonical
UPDATE public.conversation_notes cn
SET conversation_id = cm.canonical_id
FROM conversation_mapping cm
WHERE cn.conversation_id = cm.duplicate_id AND cm.rn > 1;

-- Step 4: Delete duplicate conversations
DELETE FROM public.conversations c
USING conversation_mapping cm
WHERE c.id = cm.duplicate_id AND cm.rn > 1;

-- Step 5: Ensure only one active conversation per customer remains
WITH ranked_active AS (
  SELECT 
    id, 
    customer_id,
    ROW_NUMBER() OVER (
      PARTITION BY customer_id 
      ORDER BY last_message_at DESC NULLS LAST, updated_at DESC, created_at DESC
    ) as rn
  FROM public.conversations
  WHERE status = 'active'
)
UPDATE public.conversations c
SET status = 'closed', is_archived = true
FROM ranked_active r
WHERE c.id = r.id AND r.rn > 1;

-- Clean up temp table
DROP TABLE conversation_mapping;

COMMIT;