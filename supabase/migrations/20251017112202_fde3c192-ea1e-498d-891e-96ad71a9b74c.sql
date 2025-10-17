-- Fix ademergen@gmail.com role to be 'member' instead of 'owner'
UPDATE public.business_users
SET role = 'member'
WHERE user_id = '22798455-f20b-4921-85ca-c4b76cfa06fd'
  AND business_id = 'f47ac10b-58cc-4372-a567-0e02b2c3d479';