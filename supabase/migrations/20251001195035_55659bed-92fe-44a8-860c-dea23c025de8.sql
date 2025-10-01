-- Step 1: Create a function to normalize phone numbers
CREATE OR REPLACE FUNCTION normalize_phone(phone_num TEXT) 
RETURNS TEXT AS $$
BEGIN
  RETURN REGEXP_REPLACE(REGEXP_REPLACE(phone_num, '^\+', ''), '^00', '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Step 2: Find and merge duplicate customers
WITH normalized_customers AS (
  SELECT 
    id,
    phone,
    normalize_phone(phone) as normalized_phone,
    ROW_NUMBER() OVER (PARTITION BY normalize_phone(phone) ORDER BY created_at ASC) as rn
  FROM customers
),
duplicates AS (
  SELECT 
    nc1.id as keep_id,
    nc2.id as remove_id
  FROM normalized_customers nc1
  JOIN normalized_customers nc2 
    ON nc1.normalized_phone = nc2.normalized_phone 
    AND nc1.rn = 1 
    AND nc2.rn > 1
)
-- Update conversations to point to the kept customer
UPDATE conversations
SET customer_id = d.keep_id
FROM duplicates d
WHERE customer_id = d.remove_id;

-- Update messages to point to the kept customer
WITH normalized_customers AS (
  SELECT 
    id,
    phone,
    normalize_phone(phone) as normalized_phone,
    ROW_NUMBER() OVER (PARTITION BY normalize_phone(phone) ORDER BY created_at ASC) as rn
  FROM customers
),
duplicates AS (
  SELECT 
    nc1.id as keep_id,
    nc2.id as remove_id
  FROM normalized_customers nc1
  JOIN normalized_customers nc2 
    ON nc1.normalized_phone = nc2.normalized_phone 
    AND nc1.rn = 1 
    AND nc2.rn > 1
)
UPDATE messages
SET customer_id = d.keep_id
FROM duplicates d
WHERE customer_id = d.remove_id;

-- Step 3: Delete duplicate customers
WITH normalized_customers AS (
  SELECT 
    id,
    phone,
    normalize_phone(phone) as normalized_phone,
    ROW_NUMBER() OVER (PARTITION BY normalize_phone(phone) ORDER BY created_at ASC) as rn
  FROM customers
)
DELETE FROM customers
WHERE id IN (
  SELECT id FROM normalized_customers WHERE rn > 1
);

-- Step 4: Now normalize phone numbers on remaining customers
UPDATE customers 
SET phone = normalize_phone(phone)
WHERE phone != normalize_phone(phone);