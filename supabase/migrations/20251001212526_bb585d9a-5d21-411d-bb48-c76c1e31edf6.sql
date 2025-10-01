-- Create a SECURITY DEFINER function to check roles without triggering RLS recursion
create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id
      and role = _role
  );
$$;

-- Ensure authenticated users can execute the function
grant execute on function public.has_role(uuid, app_role) to authenticated;

-- Fix recursive policy on profiles by using has_role instead of self-referencing SELECT
drop policy if exists "Superadmins can do everything on profiles" on public.profiles;
create policy "Superadmins can do everything on profiles"
on public.profiles
for all
to authenticated
using (public.has_role(auth.uid(), 'superadmin'))
with check (public.has_role(auth.uid(), 'superadmin'));

-- Update user_roles management policy to rely on has_role as well
drop policy if exists "Superadmins can manage roles" on public.user_roles;
create policy "Superadmins can manage roles"
on public.user_roles
for all
to authenticated
using (public.has_role(auth.uid(), 'superadmin'))
with check (public.has_role(auth.uid(), 'superadmin'));

-- Update business_settings policies to avoid referencing profiles table directly
drop policy if exists "Admins can insert business settings" on public.business_settings;
create policy "Admins can insert business settings"
on public.business_settings
for insert
to authenticated
with check (public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update business settings" on public.business_settings;
create policy "Admins can update business settings"
on public.business_settings
for update
to authenticated
using (public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'superadmin') or public.has_role(auth.uid(), 'admin'));
