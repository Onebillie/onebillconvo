-- Create widget_customization table for storing embed widget configurations
CREATE TABLE IF NOT EXISTS public.widget_customization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  embed_token_id UUID NOT NULL REFERENCES public.embed_tokens(id) ON DELETE CASCADE,
  
  -- Widget Style & Appearance
  widget_type TEXT NOT NULL DEFAULT 'bubble',
  icon_type TEXT NOT NULL DEFAULT 'chat',
  custom_icon_url TEXT,
  
  -- Colors
  primary_color TEXT NOT NULL DEFAULT '#6366f1',
  secondary_color TEXT NOT NULL DEFAULT '#4f46e5',
  text_color TEXT NOT NULL DEFAULT '#ffffff',
  
  -- Size & Position
  widget_size TEXT NOT NULL DEFAULT 'medium',
  widget_position TEXT NOT NULL DEFAULT 'bottom-right',
  
  -- Button Text (for button-style widgets)
  button_text TEXT DEFAULT 'Chat with us',
  show_button_text BOOLEAN DEFAULT false,
  
  -- Greeting & Messaging
  greeting_message TEXT DEFAULT 'Hi! How can we help?',
  welcome_message TEXT DEFAULT 'Welcome! Send us a message.',
  offline_message TEXT,
  
  -- Behavior
  show_unread_badge BOOLEAN DEFAULT true,
  auto_open_delay INTEGER,
  sound_notifications BOOLEAN DEFAULT false,
  
  -- Custom CSS
  custom_css TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.widget_customization ENABLE ROW LEVEL SECURITY;

-- Policies for widget_customization
CREATE POLICY "Users can view their business widget customizations"
  ON public.widget_customization
  FOR SELECT
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create widget customizations for their business"
  ON public.widget_customization
  FOR INSERT
  WITH CHECK (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their business widget customizations"
  ON public.widget_customization
  FOR UPDATE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their business widget customizations"
  ON public.widget_customization
  FOR DELETE
  USING (
    business_id IN (
      SELECT business_id FROM public.business_users WHERE user_id = auth.uid()
    )
  );

-- Indexes for faster lookups
CREATE INDEX idx_widget_customization_token ON public.widget_customization(embed_token_id);
CREATE INDEX idx_widget_customization_business ON public.widget_customization(business_id);

-- Trigger for updated_at
CREATE TRIGGER update_widget_customization_updated_at
  BEFORE UPDATE ON public.widget_customization
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();