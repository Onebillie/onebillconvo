-- Add department field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN department text;

-- Create an index for faster department-based queries
CREATE INDEX idx_profiles_department ON public.profiles(department);

COMMENT ON COLUMN public.profiles.department IS 'Staff member department: sales, customer_service, manager, renewals, technical_support, billing';
