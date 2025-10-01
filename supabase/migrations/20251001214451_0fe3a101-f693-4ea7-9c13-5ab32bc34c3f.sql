-- Fix all remaining security vulnerabilities
-- Restrict access to all sensitive tables to authenticated users only

-- ============================================
-- FIX CONVERSATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on conversations" ON public.conversations;

CREATE POLICY "Authenticated users can view conversations"
ON public.conversations
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create conversations"
ON public.conversations
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update conversations"
ON public.conversations
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete conversations"
ON public.conversations
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FIX MESSAGE_ATTACHMENTS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on message_attachments" ON public.message_attachments;

CREATE POLICY "Authenticated users can view attachments"
ON public.message_attachments
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create attachments"
ON public.message_attachments
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update attachments"
ON public.message_attachments
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete attachments"
ON public.message_attachments
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FIX CONVERSATION_NOTES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on conversation_notes" ON public.conversation_notes;

CREATE POLICY "Authenticated users can view notes"
ON public.conversation_notes
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create notes"
ON public.conversation_notes
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update notes"
ON public.conversation_notes
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete notes"
ON public.conversation_notes
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FIX TEAM_MEMBERS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on team_members" ON public.team_members;

CREATE POLICY "Authenticated users can view team members"
ON public.team_members
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can manage team members"
ON public.team_members
FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- ============================================
-- FIX TASKS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on tasks" ON public.tasks;

CREATE POLICY "Authenticated users can view tasks"
ON public.tasks
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create tasks"
ON public.tasks
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
ON public.tasks
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Authenticated users can delete tasks"
ON public.tasks
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FIX CONTACT_TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on contact_tags" ON public.contact_tags;

CREATE POLICY "Authenticated users can view contact tags"
ON public.contact_tags
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage contact tags"
ON public.contact_tags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX CUSTOMER_TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on customer_tags" ON public.customer_tags;

CREATE POLICY "Authenticated users can view customer tags"
ON public.customer_tags
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage customer tags"
ON public.customer_tags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX MESSAGE_REACTIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on message_reactions" ON public.message_reactions;

CREATE POLICY "Authenticated users can view reactions"
ON public.message_reactions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage reactions"
ON public.message_reactions
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX MESSAGE_TEMPLATES TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on message_templates" ON public.message_templates;

CREATE POLICY "Authenticated users can view templates"
ON public.message_templates
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage templates"
ON public.message_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX CONVERSATION_STATUS_TAGS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on conversation_status_tags" ON public.conversation_status_tags;

CREATE POLICY "Authenticated users can view status tags"
ON public.conversation_status_tags
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage status tags"
ON public.conversation_status_tags
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX CONVERSATION_ANALYTICS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on conversation_analytics" ON public.conversation_analytics;

CREATE POLICY "Authenticated users can view analytics"
ON public.conversation_analytics
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can manage analytics"
ON public.conversation_analytics
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- FIX TASK_NOTIFICATIONS TABLE
-- ============================================
DROP POLICY IF EXISTS "Allow all operations on task_notifications" ON public.task_notifications;

CREATE POLICY "Users can view their own notifications"
ON public.task_notifications
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "System can create notifications"
ON public.task_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own notifications"
ON public.task_notifications
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own notifications"
ON public.task_notifications
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);