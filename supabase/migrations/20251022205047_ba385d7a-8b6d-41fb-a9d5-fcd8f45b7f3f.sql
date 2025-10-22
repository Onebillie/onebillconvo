-- Create user_theme_preferences table
CREATE TABLE IF NOT EXISTS public.user_theme_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  
  -- Color scheme (HSL values without hsl() wrapper)
  primary_color TEXT DEFAULT '222.2 47.4% 11.2%',
  primary_foreground TEXT DEFAULT '210 40% 98%',
  secondary_color TEXT DEFAULT '210 40% 96.1%',
  secondary_foreground TEXT DEFAULT '222.2 47.4% 11.2%',
  accent_color TEXT DEFAULT '210 40% 96.1%',
  accent_foreground TEXT DEFAULT '222.2 47.4% 11.2%',
  background_color TEXT DEFAULT '0 0% 100%',
  foreground_color TEXT DEFAULT '222.2 47.4% 11.2%',
  card_color TEXT DEFAULT '0 0% 100%',
  card_foreground TEXT DEFAULT '222.2 47.4% 11.2%',
  muted_color TEXT DEFAULT '210 40% 96.1%',
  muted_foreground TEXT DEFAULT '215.4 16.3% 46.9%',
  border_color TEXT DEFAULT '214.3 31.8% 91.4%',
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  
  UNIQUE(user_id, business_id)
);

-- Enable RLS
ALTER TABLE public.user_theme_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own theme preferences"
  ON public.user_theme_preferences
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own theme preferences"
  ON public.user_theme_preferences
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own theme preferences"
  ON public.user_theme_preferences
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_user_theme_preferences_updated_at
  BEFORE UPDATE ON public.user_theme_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Index for faster lookups
CREATE INDEX idx_user_theme_preferences_user_business 
  ON public.user_theme_preferences(user_id, business_id);