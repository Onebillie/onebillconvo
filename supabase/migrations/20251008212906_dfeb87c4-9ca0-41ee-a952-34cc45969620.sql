-- Step 1: First check if there's any existing data with assigned_to values
-- If assigned_to contains UUID values, we can safely convert it

-- Step 2: Add a new column with UUID type
ALTER TABLE conversations ADD COLUMN assigned_to_uuid UUID;

-- Step 3: Try to copy valid UUIDs from the text column to the new UUID column
UPDATE conversations 
SET assigned_to_uuid = assigned_to::uuid 
WHERE assigned_to IS NOT NULL 
  AND assigned_to ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Step 4: Drop the old text column
ALTER TABLE conversations DROP COLUMN assigned_to;

-- Step 5: Rename the new column to assigned_to
ALTER TABLE conversations RENAME COLUMN assigned_to_uuid TO assigned_to;

-- Step 6: Add the foreign key constraint
ALTER TABLE conversations 
ADD CONSTRAINT fk_conversations_assigned_to 
FOREIGN KEY (assigned_to) 
REFERENCES profiles(id) 
ON DELETE SET NULL;

-- Step 7: Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_conversations_assigned_to ON conversations(assigned_to);