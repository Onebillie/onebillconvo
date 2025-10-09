-- Create pending_subscriptions table for handling email verification flow
CREATE TABLE IF NOT EXISTS public.pending_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  selected_plan TEXT NOT NULL,
  stripe_session_id TEXT,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '7 days')
);

-- Enable RLS
ALTER TABLE public.pending_subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own pending subscriptions
CREATE POLICY "Users can view their own pending subscriptions"
ON public.pending_subscriptions
FOR SELECT
USING (auth.uid() = user_id);

-- Policy: Users can insert their own pending subscriptions
CREATE POLICY "Users can insert their own pending subscriptions"
ON public.pending_subscriptions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own pending subscriptions
CREATE POLICY "Users can update their own pending subscriptions"
ON public.pending_subscriptions
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_pending_subscriptions_user_id ON public.pending_subscriptions(user_id);
CREATE INDEX idx_pending_subscriptions_completed ON public.pending_subscriptions(completed) WHERE completed = FALSE;