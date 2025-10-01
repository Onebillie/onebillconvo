-- Add unique constraint to admin_users if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'admin_users_user_id_key'
  ) THEN
    ALTER TABLE public.admin_users 
    ADD CONSTRAINT admin_users_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Add adem@onebill.ie as super admin
INSERT INTO public.admin_users (user_id, role)
SELECT id, 'super_admin'::admin_role
FROM auth.users
WHERE email = 'adem@onebill.ie'
ON CONFLICT (user_id) DO UPDATE 
SET role = 'super_admin'::admin_role;