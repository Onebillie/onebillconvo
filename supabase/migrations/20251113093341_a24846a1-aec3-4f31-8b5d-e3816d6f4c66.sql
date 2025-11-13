-- Drop the old check constraint that limits priority_score to 1-10
ALTER TABLE conversation_status_tags 
DROP CONSTRAINT IF EXISTS conversation_status_tags_priority_score_check;

-- Add new check constraint for 1-100 range
ALTER TABLE conversation_status_tags 
ADD CONSTRAINT conversation_status_tags_priority_score_check 
CHECK (priority_score >= 1 AND priority_score <= 100);

-- Create "Unread" status with priority_score 90
INSERT INTO conversation_status_tags (name, color, priority_score, icon)
VALUES ('Unread', '#ef4444', 90, 'mail')
ON CONFLICT (name) DO UPDATE 
SET priority_score = 90, color = '#ef4444', icon = 'mail';

-- Update default priority_score for existing statuses
UPDATE conversation_status_tags 
SET priority_score = CASE name
  WHEN 'Urgent' THEN 95
  WHEN 'Unread' THEN 90
  WHEN 'Complaint' THEN 70
  WHEN 'New' THEN 60
  WHEN 'In Progress' THEN 50
  WHEN 'Lead' THEN 40
  WHEN 'Waiting' THEN 30
  WHEN 'Resolved' THEN 10
  ELSE 50
END
WHERE name IN ('Urgent', 'Unread', 'Complaint', 'New', 'In Progress', 'Lead', 'Waiting', 'Resolved');