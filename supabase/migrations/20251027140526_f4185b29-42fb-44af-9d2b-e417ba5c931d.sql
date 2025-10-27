-- Fix remaining non-trigger functions with SET search_path

-- Recreate sync_all_email_accounts function
DROP FUNCTION IF EXISTS public.sync_all_email_accounts() CASCADE;
CREATE OR REPLACE FUNCTION public.sync_all_email_accounts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  account record;
BEGIN
  FOR account IN 
    SELECT id FROM email_accounts 
    WHERE is_active = true 
    AND last_sync_at < NOW() - INTERVAL '5 minutes'
  LOOP
    PERFORM net.http_post(
      url := current_setting('app.supabase_url') || '/functions/v1/email-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key'),
        'Content-Type', 'application/json'
      ),
      body := jsonb_build_object('account_id', account.id)
    );
  END LOOP;
END;
$function$;

-- Recreate cleanup_expired_sso_tokens function
DROP FUNCTION IF EXISTS public.cleanup_expired_sso_tokens() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_sso_tokens()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM sso_tokens WHERE expires_at < now();
END;
$function$;

-- Recreate cleanup_expired_oauth_states function
DROP FUNCTION IF EXISTS public.cleanup_expired_oauth_states() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_oauth_states()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM oauth_states WHERE expires_at < now();
END;
$function$;

-- Recreate cleanup_expired_embed_sessions function
DROP FUNCTION IF EXISTS public.cleanup_expired_embed_sessions() CASCADE;
CREATE OR REPLACE FUNCTION public.cleanup_expired_embed_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  DELETE FROM embed_sessions WHERE expires_at < now();
END;
$function$;