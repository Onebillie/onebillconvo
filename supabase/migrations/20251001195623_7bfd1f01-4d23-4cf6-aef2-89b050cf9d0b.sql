-- Archive duplicate active conversations per customer, keeping the most recent
WITH ranked AS (
  SELECT id, customer_id, updated_at,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC, created_at DESC) AS rn
  FROM conversations
  WHERE status = 'active'
)
UPDATE conversations c
SET status = 'closed', is_archived = true
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- Enforce single active conversation per customer
CREATE UNIQUE INDEX IF NOT EXISTS ux_conversations_unique_active
ON public.conversations (customer_id)
WHERE status = 'active';