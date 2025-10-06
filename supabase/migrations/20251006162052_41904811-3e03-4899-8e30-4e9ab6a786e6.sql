-- Add Tugay to OneBillChat business as admin
INSERT INTO public.business_users (business_id, user_id, role)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '62ee4b5e-9baa-4075-a36a-090ae7ea0220',
  'admin'
)
ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'admin';

-- Add Safiye to OneBillChat business as admin
INSERT INTO public.business_users (business_id, user_id, role)
VALUES (
  'f47ac10b-58cc-4372-a567-0e02b2c3d479',
  '40c0458a-ebc2-44d6-bf7f-6e71ea4d8d9d',
  'admin'
)
ON CONFLICT (business_id, user_id) DO UPDATE SET role = 'admin';

-- Assign admin role to Tugay in user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '62ee4b5e-9baa-4075-a36a-090ae7ea0220',
  'admin'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;

-- Assign admin role to Safiye in user_roles
INSERT INTO public.user_roles (user_id, role)
VALUES (
  '40c0458a-ebc2-44d6-bf7f-6e71ea4d8d9d',
  'admin'::app_role
)
ON CONFLICT (user_id, role) DO NOTHING;