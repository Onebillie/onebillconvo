-- Add missing INSERT and UPDATE policies for attachment_parse_results
-- The edge function uses service role key, so these policies allow service role operations

CREATE POLICY "Service role can insert parse results"
ON public.attachment_parse_results
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update parse results"
ON public.attachment_parse_results
FOR UPDATE
USING (true)
WITH CHECK (true);