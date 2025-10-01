-- Create the api schema
CREATE SCHEMA IF NOT EXISTS api;

-- Grant usage on api schema
GRANT USAGE ON SCHEMA api TO anon, authenticated, service_role;

-- Create views in api schema pointing to public tables
CREATE OR REPLACE VIEW api.customers AS SELECT * FROM public.customers;
CREATE OR REPLACE VIEW api.conversations AS SELECT * FROM public.conversations;
CREATE OR REPLACE VIEW api.messages AS SELECT * FROM public.messages;
CREATE OR REPLACE VIEW api.message_attachments AS SELECT * FROM public.message_attachments;
CREATE OR REPLACE VIEW api.platform_connections AS SELECT * FROM public.platform_connections;

-- Grant permissions on the views
GRANT SELECT, INSERT, UPDATE, DELETE ON api.customers TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.conversations TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.messages TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.message_attachments TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON api.platform_connections TO anon, authenticated, service_role;

-- Enable RLS on views (they inherit from base tables)
ALTER VIEW api.customers SET (security_barrier = true);
ALTER VIEW api.conversations SET (security_barrier = true);
ALTER VIEW api.messages SET (security_barrier = true);
ALTER VIEW api.message_attachments SET (security_barrier = true);
ALTER VIEW api.platform_connections SET (security_barrier = true);

-- Create INSTEAD OF triggers for the views to handle INSERT/UPDATE/DELETE operations
CREATE OR REPLACE FUNCTION api.customers_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION api.customers_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.customers SET
    name = NEW.name,
    phone = NEW.phone,
    email = NEW.email,
    avatar = NEW.avatar,
    whatsapp = NEW.whatsapp,
    instagram = NEW.instagram,
    facebook = NEW.facebook,
    twitter = NEW.twitter,
    tags = NEW.tags,
    last_active = NEW.last_active,
    notes = NEW.notes,
    metadata = NEW.metadata,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION api.customers_delete()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.customers WHERE id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER customers_insert_trigger
INSTEAD OF INSERT ON api.customers
FOR EACH ROW EXECUTE FUNCTION api.customers_insert();

CREATE TRIGGER customers_update_trigger
INSTEAD OF UPDATE ON api.customers
FOR EACH ROW EXECUTE FUNCTION api.customers_update();

CREATE TRIGGER customers_delete_trigger
INSTEAD OF DELETE ON api.customers
FOR EACH ROW EXECUTE FUNCTION api.customers_delete();

-- Conversations triggers
CREATE OR REPLACE FUNCTION api.conversations_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.conversations VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION api.conversations_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.conversations SET
    customer_id = NEW.customer_id,
    status = NEW.status,
    assigned_to = NEW.assigned_to,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER conversations_insert_trigger
INSTEAD OF INSERT ON api.conversations
FOR EACH ROW EXECUTE FUNCTION api.conversations_insert();

CREATE TRIGGER conversations_update_trigger
INSTEAD OF UPDATE ON api.conversations
FOR EACH ROW EXECUTE FUNCTION api.conversations_update();

-- Messages triggers
CREATE OR REPLACE FUNCTION api.messages_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.messages VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION api.messages_update()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.messages SET
    conversation_id = NEW.conversation_id,
    customer_id = NEW.customer_id,
    content = NEW.content,
    platform = NEW.platform,
    direction = NEW.direction,
    thread_id = NEW.thread_id,
    external_message_id = NEW.external_message_id,
    is_read = NEW.is_read,
    updated_at = NEW.updated_at
  WHERE id = OLD.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER messages_insert_trigger
INSTEAD OF INSERT ON api.messages
FOR EACH ROW EXECUTE FUNCTION api.messages_insert();

CREATE TRIGGER messages_update_trigger
INSTEAD OF UPDATE ON api.messages
FOR EACH ROW EXECUTE FUNCTION api.messages_update();

-- Message attachments trigger
CREATE OR REPLACE FUNCTION api.message_attachments_insert()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.message_attachments VALUES (NEW.*);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER message_attachments_insert_trigger
INSTEAD OF INSERT ON api.message_attachments
FOR EACH ROW EXECUTE FUNCTION api.message_attachments_insert();