-- Create businesses table for multi-tenant support
CREATE TABLE public.businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  subscription_tier TEXT DEFAULT 'free',
  subscription_status TEXT DEFAULT 'trialing',
  trial_ends_at TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '72 hours'),
  subscription_started_at TIMESTAMP WITH TIME ZONE,
  subscription_ends_at TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  cancellation_history JSONB DEFAULT '[]'::jsonb,
  message_count_current_period INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create business_users junction table (many-to-many relationship)
CREATE TABLE public.business_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(business_id, user_id)
);

-- Create usage_tracking table for message counting
CREATE TABLE public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,
  message_count INTEGER DEFAULT 0,
  base_fee DECIMAL(10,2),
  message_fee DECIMAL(10,2),
  total_fee DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscriptions history table
CREATE TABLE public.subscription_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
  event_type TEXT NOT NULL,
  old_tier TEXT,
  new_tier TEXT,
  stripe_event_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for businesses
CREATE POLICY "Users can view businesses they belong to"
  ON public.businesses FOR SELECT
  USING (
    id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create businesses"
  ON public.businesses FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Business owners can update their businesses"
  ON public.businesses FOR UPDATE
  USING (owner_id = auth.uid());

-- RLS Policies for business_users
CREATE POLICY "Users can view business memberships"
  ON public.business_users FOR SELECT
  USING (
    user_id = auth.uid() 
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

CREATE POLICY "Business owners can manage members"
  ON public.business_users FOR ALL
  USING (
    business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for usage_tracking
CREATE POLICY "Business members can view usage"
  ON public.usage_tracking FOR SELECT
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- RLS Policies for subscription_history
CREATE POLICY "Business members can view subscription history"
  ON public.subscription_history FOR SELECT
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
    OR business_id IN (SELECT id FROM public.businesses WHERE owner_id = auth.uid())
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_businesses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for businesses updated_at
CREATE TRIGGER update_businesses_timestamp
  BEFORE UPDATE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_businesses_updated_at();

-- Function to track message usage
CREATE OR REPLACE FUNCTION increment_message_count(business_uuid UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.businesses
  SET message_count_current_period = message_count_current_period + 1
  WHERE id = business_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add indexes for performance
CREATE INDEX idx_businesses_owner ON public.businesses(owner_id);
CREATE INDEX idx_businesses_stripe_customer ON public.businesses(stripe_customer_id);
CREATE INDEX idx_business_users_user ON public.business_users(user_id);
CREATE INDEX idx_business_users_business ON public.business_users(business_id);
CREATE INDEX idx_usage_tracking_business ON public.usage_tracking(business_id);
CREATE INDEX idx_subscription_history_business ON public.subscription_history(business_id);