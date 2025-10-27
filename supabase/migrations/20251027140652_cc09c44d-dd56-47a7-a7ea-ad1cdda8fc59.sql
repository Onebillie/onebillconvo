-- Fix the last 3 remaining functions without search_path

ALTER FUNCTION public.is_onebillchat_user() SET search_path TO 'public';
ALTER FUNCTION public.notify_conversation_assignment() SET search_path TO 'public';
ALTER FUNCTION public.notify_conversation_transfer() SET search_path TO 'public';