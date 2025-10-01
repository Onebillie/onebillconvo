-- Create tables for team management, statuses, and tasks
BEGIN;

-- 1. Team members table (staff who can be assigned conversations)
CREATE TABLE IF NOT EXISTS public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT DEFAULT 'agent',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on team_members" 
ON public.team_members 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 2. Conversation status tags
CREATE TABLE IF NOT EXISTS public.conversation_status_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  icon TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.conversation_status_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on conversation_status_tags" 
ON public.conversation_status_tags 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Insert default statuses
INSERT INTO public.conversation_status_tags (name, color, icon) VALUES
  ('New', '#3b82f6', 'inbox'),
  ('In Progress', '#f59e0b', 'clock'),
  ('Waiting', '#8b5cf6', 'timer'),
  ('Resolved', '#10b981', 'check-circle'),
  ('Urgent', '#ef4444', 'alert-circle')
ON CONFLICT (name) DO NOTHING;

-- 3. Add status_tag_id to conversations table
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'conversations' AND column_name = 'status_tag_id'
  ) THEN
    ALTER TABLE public.conversations 
    ADD COLUMN status_tag_id UUID REFERENCES public.conversation_status_tags(id);
  END IF;
END $$;

-- 4. Tasks table (for scheduled tasks from messages)
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  assigned_to UUID REFERENCES public.team_members(id),
  due_date TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES public.team_members(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on tasks" 
ON public.tasks 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create index for due date queries
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON public.tasks(due_date) WHERE status != 'done' AND status != 'cancelled';
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON public.tasks(assigned_to);

-- 5. Task notifications table (for persistent notifications)
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.team_members(id) ON DELETE CASCADE NOT NULL,
  is_read BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(task_id, user_id)
);

ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all operations on task_notifications" 
ON public.task_notifications 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- 6. Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at
BEFORE UPDATE ON public.team_members
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 7. Create function to create notification when task is created/assigned
CREATE OR REPLACE FUNCTION public.create_task_notification()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL THEN
    INSERT INTO public.task_notifications (task_id, user_id)
    VALUES (NEW.id, NEW.assigned_to)
    ON CONFLICT (task_id, user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS create_task_notification_trigger ON public.tasks;
CREATE TRIGGER create_task_notification_trigger
AFTER INSERT OR UPDATE OF assigned_to ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.create_task_notification();

COMMIT;