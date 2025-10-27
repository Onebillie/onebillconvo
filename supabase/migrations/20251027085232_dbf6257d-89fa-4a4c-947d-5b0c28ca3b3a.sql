-- Drop existing problematic policies
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- Create new policies with proper UUID handling and path flexibility
create policy "avatars_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (
    name like auth.uid()::text || '-%'
    or name like 'avatars/' || auth.uid()::text || '-%'
  )
);

create policy "avatars_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (
    name like auth.uid()::text || '-%'
    or name like 'avatars/' || auth.uid()::text || '-%'
  )
)
with check (
  bucket_id = 'avatars'
  and (
    name like auth.uid()::text || '-%'
    or name like 'avatars/' || auth.uid()::text || '-%'
  )
);

create policy "avatars_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (
    name like auth.uid()::text || '-%'
    or name like 'avatars/' || auth.uid()::text || '-%'
  )
);