-- Fix all remaining functions with missing search_path using ALTER FUNCTION
-- This approach doesn't drop functions, just adds the security setting

-- Core business functions
ALTER FUNCTION public.generate_referral_code() SET search_path TO 'public';
ALTER FUNCTION public.generate_site_id() SET search_path TO 'public';
ALTER FUNCTION public.normalize_phone(text) SET search_path TO 'public';

-- User/business authorization functions
ALTER FUNCTION public.get_or_create_user_business(uuid) SET search_path TO 'public';
ALTER FUNCTION public.get_user_business_ids(uuid) SET search_path TO 'public';
ALTER FUNCTION public.handle_new_user() SET search_path TO 'public';
ALTER FUNCTION public.has_role(uuid, app_role) SET search_path TO 'public';
ALTER FUNCTION public.is_account_frozen(uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_admin_session() SET search_path TO 'public';
ALTER FUNCTION public.is_business_owner(uuid, uuid) SET search_path TO 'public';
ALTER FUNCTION public.is_device_trusted(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.is_ip_whitelisted(uuid, text) SET search_path TO 'public';
ALTER FUNCTION public.user_belongs_to_business(uuid, uuid) SET search_path TO 'public';

-- Message and conversation functions
ALTER FUNCTION public.increment_message_count(uuid) SET search_path TO 'public';
ALTER FUNCTION public.mark_conversation_resolved(uuid, text, numeric) SET search_path TO 'public';

-- Trigger functions
ALTER FUNCTION public.auto_create_task_from_status() SET search_path TO 'public';
ALTER FUNCTION public.check_auto_topup_trigger() SET search_path TO 'public';
ALTER FUNCTION public.check_low_voice_credits() SET search_path TO 'public';
ALTER FUNCTION public.normalize_customer_phone_trigger() SET search_path TO 'public';
ALTER FUNCTION public.notify_task_assignment() SET search_path TO 'public';
ALTER FUNCTION public.trigger_email_sync() SET search_path TO 'public';

-- Cleanup/maintenance functions
ALTER FUNCTION public.cleanup_expired_embed_sessions() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_oauth_states() SET search_path TO 'public';
ALTER FUNCTION public.cleanup_expired_sso_tokens() SET search_path TO 'public';
ALTER FUNCTION public.sync_all_email_accounts() SET search_path TO 'public';