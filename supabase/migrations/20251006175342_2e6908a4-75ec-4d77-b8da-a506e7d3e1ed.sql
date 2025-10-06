-- Fix infinite recursion in RLS involving businesses <-> business_users and repair signup error inserting profiles.role

-- 1) Create a SECURITY DEFINER helper to check ownership without triggering RLS recursion
create or replace function public.is_business_owner(_user_id uuid, _business_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses b
    where b.id = _business_id
      and b.owner_id = _user_id
  );
$$;

-- 2) Replace recursive SELECT policy on business_users
--    Old policy referenced businesses in a subquery, which combined with
--    businesses policies calling get_user_business_ids() (reading business_users)
--    could cause infinite recursion.

drop policy if exists "Users can view business memberships" on public.business_users;

create policy "Users can view business memberships"
on public.business_users
for select
to authenticated
using (
  -- members can see their own membership
  (user_id = auth.uid())
  -- owners can see all memberships for their business without recursion
  or public.is_business_owner(auth.uid(), business_id)
  -- superadmins can see everything
  or public.has_role(auth.uid(), 'superadmin'::app_role)
);

-- 3) Fix handle_new_user trigger function to not reference profiles.role (column doesn't exist)
--    and assign roles via user_roles table instead.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Ensure profile exists/updates without a role column
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    new.email
  )
  on conflict (id) do update
    set full_name = excluded.full_name,
        email = excluded.email,
        updated_at = now();

  -- Assign default role in user_roles table (not on profiles)
  insert into public.user_roles (user_id, role)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::app_role, 'agent'::app_role)
  )
  on conflict (user_id, role) do nothing;

  return new;
end;
$$;
