-- Fix Customer Contact Information Security Issue
-- Ensure RLS is enabled and policies properly restrict access

-- First, ensure RLS is enabled on customers table
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

-- Drop existing overly permissive policies
DROP POLICY IF EXISTS "Business members can view customers" ON public.customers;
DROP POLICY IF EXISTS "Business members can manage customers" ON public.customers;

-- Create restrictive SELECT policy that only allows authenticated business members
CREATE POLICY "Business members can view their business customers"
ON public.customers
FOR SELECT
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create restrictive INSERT policy
CREATE POLICY "Business members can create customers in their business"
ON public.customers
FOR INSERT
TO authenticated
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create restrictive UPDATE policy
CREATE POLICY "Business members can update their business customers"
ON public.customers
FOR UPDATE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
)
WITH CHECK (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);

-- Create restrictive DELETE policy
CREATE POLICY "Business members can delete their business customers"
ON public.customers
FOR DELETE
TO authenticated
USING (
  business_id IN (
    SELECT business_id 
    FROM public.business_users 
    WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'superadmin'::app_role)
);