-- Fix database security: Update functions with mutable search_path
-- This addresses 6 WARN issues from the linter

ALTER FUNCTION public.cleanup_expired_sso_tokens() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_oauth_states() SET search_path TO 'public';
ALTER FUNCTION public.trigger_email_sync() SET search_path TO 'public';
ALTER FUNCTION public.sync_all_email_accounts() SET search_path TO 'public';
ALTER FUNCTION public.generate_site_id() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_embed_sessions() SET search_path TO 'public';
ALTER FUNCTION public.update_embed_updated_at() SET search_path TO 'public';