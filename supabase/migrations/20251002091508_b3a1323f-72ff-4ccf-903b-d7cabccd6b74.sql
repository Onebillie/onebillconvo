-- Add superadmin role for existing user
INSERT INTO public.user_roles (user_id, role)
VALUES ('77e75511-4e0e-4487-bdd8-3861c3da50fa', 'superadmin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;