-- Create trigger to send InMail notification when a task is assigned
CREATE OR REPLACE FUNCTION notify_task_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assigner_name TEXT;
  task_title TEXT;
BEGIN
  -- Get assigner's name
  SELECT full_name INTO assigner_name
  FROM profiles
  WHERE id = NEW.created_by;

  -- Get task title
  task_title := COALESCE(NEW.title, 'New Task');

  -- Send InMail notification to assignee
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO in_mail_messages (
      sender_id,
      recipient_id,
      subject,
      content,
      priority,
      task_id,
      is_read
    ) VALUES (
      NEW.created_by,
      NEW.assigned_to,
      'Task Assigned: ' || task_title,
      COALESCE(assigner_name, 'A team member') || ' has assigned you a task: ' || task_title || 
      CASE WHEN NEW.description IS NOT NULL THEN E'\n\n' || NEW.description ELSE '' END,
      CASE 
        WHEN NEW.priority = 'urgent' THEN 'urgent'
        WHEN NEW.priority = 'high' THEN 'high'
        ELSE 'normal'
      END,
      NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS task_assignment_notification ON tasks;
CREATE TRIGGER task_assignment_notification
  AFTER INSERT ON tasks
  FOR EACH ROW
  WHEN (NEW.assigned_to IS NOT NULL)
  EXECUTE FUNCTION notify_task_assignment();

-- Create trigger to send InMail notification when a conversation is assigned
CREATE OR REPLACE FUNCTION notify_conversation_assignment()
RETURNS TRIGGER AS $$
DECLARE
  assigner_name TEXT;
  customer_name TEXT;
BEGIN
  -- Only notify if assigned_to changed and is not null
  IF NEW.assigned_to IS NOT NULL AND (TG_OP = 'INSERT' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to) THEN
    -- Get assigner's name (from the current user)
    SELECT full_name INTO assigner_name
    FROM profiles
    WHERE id = auth.uid();

    -- Get customer name
    SELECT name INTO customer_name
    FROM customers
    WHERE id = NEW.customer_id;

    -- Send InMail notification to assignee
    INSERT INTO in_mail_messages (
      sender_id,
      recipient_id,
      subject,
      content,
      priority,
      conversation_id,
      is_read
    ) VALUES (
      COALESCE(auth.uid(), NEW.assigned_to),
      NEW.assigned_to,
      'Conversation Assigned: ' || COALESCE(customer_name, 'Customer'),
      COALESCE(assigner_name, 'A team member') || ' has assigned you a conversation with ' || 
      COALESCE(customer_name, 'a customer') || '.',
      'normal',
      NEW.id,
      false
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS conversation_assignment_notification ON conversations;
CREATE TRIGGER conversation_assignment_notification
  AFTER INSERT OR UPDATE OF assigned_to ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_assignment();

-- Create trigger to send InMail notification when a conversation is transferred
CREATE OR REPLACE FUNCTION notify_conversation_transfer()
RETURNS TRIGGER AS $$
DECLARE
  transferrer_name TEXT;
  customer_name TEXT;
BEGIN
  -- Get transferrer's name
  SELECT full_name INTO transferrer_name
  FROM profiles
  WHERE id = NEW.from_user_id;

  -- Get customer name from conversation
  SELECT c.name INTO customer_name
  FROM conversations conv
  JOIN customers c ON c.id = conv.customer_id
  WHERE conv.id = NEW.conversation_id;

  -- Send InMail notification to the new assignee
  INSERT INTO in_mail_messages (
    sender_id,
    recipient_id,
    subject,
    content,
    priority,
    conversation_id,
    is_read
  ) VALUES (
    NEW.from_user_id,
    NEW.to_user_id,
    'Conversation Transferred: ' || COALESCE(customer_name, 'Customer'),
    COALESCE(transferrer_name, 'A team member') || ' has transferred a conversation with ' || 
    COALESCE(customer_name, 'a customer') || ' to you.' ||
    CASE WHEN NEW.reason IS NOT NULL THEN E'\n\nReason: ' || NEW.reason ELSE '' END ||
    CASE WHEN NEW.notes IS NOT NULL THEN E'\n\nNotes: ' || NEW.notes ELSE '' END,
    'normal',
    NEW.conversation_id,
    false
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS conversation_transfer_notification ON conversation_transfers;
CREATE TRIGGER conversation_transfer_notification
  AFTER INSERT ON conversation_transfers
  FOR EACH ROW
  EXECUTE FUNCTION notify_conversation_transfer();