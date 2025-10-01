-- Fix security warning: Set search_path on normalize_phone function
CREATE OR REPLACE FUNCTION normalize_phone(phone_num TEXT) 
RETURNS TEXT 
LANGUAGE plpgsql 
IMMUTABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN REGEXP_REPLACE(REGEXP_REPLACE(phone_num, '^\+', ''), '^00', '');
END;
$$;

-- Fix security warning: Set search_path on update_conversation_last_message function
CREATE OR REPLACE FUNCTION public.update_conversation_last_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at,
      updated_at = NEW.created_at
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;