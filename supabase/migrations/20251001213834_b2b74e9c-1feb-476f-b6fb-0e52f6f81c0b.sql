-- Fix security vulnerability: Restrict access to customer and user data
-- Only authenticated users should be able to access this sensitive information

-- ============================================
-- FIX CUSTOMERS TABLE RLS POLICIES
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on customers" ON public.customers;

-- Create proper authentication-based policies
-- Only authenticated users (staff) can view customer data
CREATE POLICY "Authenticated users can view customers"
ON public.customers
FOR SELECT
TO authenticated
USING (true);

-- Only authenticated users can create customers
CREATE POLICY "Authenticated users can create customers"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Only authenticated users can update customers
CREATE POLICY "Authenticated users can update customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Only authenticated users can delete customers
CREATE POLICY "Authenticated users can delete customers"
ON public.customers
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- FIX USERS TABLE RLS POLICIES
-- ============================================

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Allow all operations on users" ON public.users;

-- Create proper authentication-based policies
-- Authenticated users can view all users (for assignment purposes)
CREATE POLICY "Authenticated users can view users"
ON public.users
FOR SELECT
TO authenticated
USING (true);

-- Only admins/superadmins can modify users
CREATE POLICY "Admins can insert users"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Admins can update users"
ON public.users
FOR UPDATE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);

CREATE POLICY "Admins can delete users"
ON public.users
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin'::app_role) OR 
  public.has_role(auth.uid(), 'superadmin'::app_role)
);