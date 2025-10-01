BEGIN;

-- 1) Normalize all existing customer phone numbers (remove + and leading 00)
UPDATE public.customers
SET phone = public.normalize_phone(phone);

-- 2) Build a temp table with duplicate customers by normalized phone
CREATE TEMP TABLE tmp_dups AS
SELECT id, canonical_id FROM (
  SELECT id, phone, created_at,
         ROW_NUMBER() OVER (PARTITION BY phone ORDER BY created_at ASC, id ASC) AS rn,
         FIRST_VALUE(id) OVER (PARTITION BY phone ORDER BY created_at ASC, id ASC) AS canonical_id
  FROM public.customers
) s
WHERE rn > 1;

-- Reassign conversations to canonical customers
UPDATE public.conversations c
SET customer_id = d.canonical_id
FROM tmp_dups d
WHERE c.customer_id = d.id;

-- Reassign messages to canonical customers
UPDATE public.messages m
SET customer_id = d.canonical_id
FROM tmp_dups d
WHERE m.customer_id = d.id;

-- Reassign customer tags to canonical customers
UPDATE public.customer_tags ct
SET customer_id = d.canonical_id
FROM tmp_dups d
WHERE ct.customer_id = d.id;

-- Delete duplicate customers
DELETE FROM public.customers c
USING tmp_dups d
WHERE c.id = d.id;

-- Clean up temp table
DROP TABLE tmp_dups;

-- 3) Ensure only one active conversation per customer (close older ones)
WITH ranked AS (
  SELECT id, customer_id, updated_at, created_at,
         ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY updated_at DESC, created_at DESC, id DESC) AS rn
  FROM public.conversations
  WHERE status = 'active'
)
UPDATE public.conversations c
SET status = 'closed', is_archived = true
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

-- 4) Enforce unique normalized phone going forward
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'ux_customers_phone'
  ) THEN
    CREATE UNIQUE INDEX ux_customers_phone ON public.customers (phone);
  END IF;
END $$;

-- 5) Add trigger to normalize phone on INSERT/UPDATE to keep data consistent
CREATE OR REPLACE FUNCTION public.normalize_customer_phone_trigger()
RETURNS TRIGGER AS $$
BEGIN
  NEW.phone = public.normalize_phone(NEW.phone);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_normalize_customer_phone ON public.customers;

CREATE TRIGGER trg_normalize_customer_phone
BEFORE INSERT OR UPDATE ON public.customers
FOR EACH ROW
EXECUTE FUNCTION public.normalize_customer_phone_trigger();

-- 6) Enforce a single active conversation per customer (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'ux_conversations_unique_active'
  ) THEN
    CREATE UNIQUE INDEX ux_conversations_unique_active
    ON public.conversations (customer_id)
    WHERE status = 'active';
  END IF;
END $$;

COMMIT;