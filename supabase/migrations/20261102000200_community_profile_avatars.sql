alter table public.community_profiles
  add column avatar_path text,
  add constraint community_profiles_avatar_path_owner_check
    check (
      avatar_path is null
      or (
        cardinality(string_to_array(avatar_path, '/')) = 2
        and split_part(avatar_path, '/', 1) = id::text
        and split_part(avatar_path, '/', 2) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      )
    );

grant update (avatar_path) on public.community_profiles to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'community-avatars',
  'community-avatars',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Community members can view shared profile photos"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'community-avatars'
    and (
      split_part(name, '/', 1) = (select auth.uid())::text
      or exists (
        select 1
        from public.community_memberships as viewer_membership
        join public.community_memberships as owner_membership
          on owner_membership.group_id = viewer_membership.group_id
        join public.community_groups as community
          on community.id = viewer_membership.group_id
        where viewer_membership.user_id = (select auth.uid())
          and owner_membership.user_id::text = split_part(storage.objects.name, '/', 1)
          and community.active
      )
    )
  );

create policy "Users can upload their own profile photo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'community-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and cardinality(string_to_array(name, '/')) = 2
  );

create policy "Users can replace their own profile photo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'community-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and cardinality(string_to_array(name, '/')) = 2
  )
  with check (
    bucket_id = 'community-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and cardinality(string_to_array(name, '/')) = 2
  );

create policy "Users can remove their own profile photo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'community-avatars'
    and split_part(name, '/', 1) = (select auth.uid())::text
    and split_part(name, '/', 2) ~ '^avatar-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    and cardinality(string_to_array(name, '/')) = 2
  );
