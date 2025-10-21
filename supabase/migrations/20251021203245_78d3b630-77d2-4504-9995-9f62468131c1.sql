-- Fix RLS policy on embed_tokens to allow INSERT
DROP POLICY IF EXISTS "Business owners can manage their embed tokens" ON public.embed_tokens;

CREATE POLICY "Business owners can manage their embed tokens"
  ON public.embed_tokens
  FOR ALL
  USING (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
  )
  WITH CHECK (
    business_id IN (SELECT business_id FROM public.business_users WHERE user_id = auth.uid())
  );

-- Remove duplicate widget_customization entries, keeping only the most recent one
DELETE FROM public.widget_customization
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY business_id, embed_token_id 
      ORDER BY created_at DESC
    ) as rn
    FROM public.widget_customization
  ) t
  WHERE t.rn > 1
);

-- Add unique constraint on widget_customization for (business_id, embed_token_id)
CREATE UNIQUE INDEX IF NOT EXISTS ux_widget_customization_business_token 
  ON public.widget_customization(business_id, embed_token_id);