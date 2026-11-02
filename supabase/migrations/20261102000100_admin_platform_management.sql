alter table public.community_profiles
  add column activity_tracking_enabled boolean not null default true;

grant update (activity_tracking_enabled) on public.community_profiles to authenticated;

create policy "Users can update their own activity preference"
  on public.community_profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

alter table public.community_memberships
  drop constraint community_memberships_pkey;

alter table public.community_memberships
  add constraint community_memberships_pkey primary key (user_id, group_id);

create function public.is_community_group_member(requested_group_id text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_memberships as membership
    join public.community_groups as community
      on community.id = membership.group_id
    where membership.user_id = (select auth.uid())
      and membership.group_id = requested_group_id
      and community.active
  );
$$;

revoke all on function public.is_community_group_member(text) from public, anon;
grant execute on function public.is_community_group_member(text) to authenticated;

drop policy "Users can read their own sector membership"
  on public.community_memberships;

create policy "Members can read their own and fellow group memberships"
  on public.community_memberships for select to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_community_group_member(group_id))
  );

grant select on public.community_groups to anon;

create policy "Visitors can browse active communities"
  on public.community_groups for select to anon
  using (active);

drop policy "Group members can read messages not blocked by them"
  on public.community_messages;

create policy "Active group members can read messages not blocked by them"
  on public.community_messages for select to authenticated
  using (
    exists (
      select 1
      from public.community_memberships
      join public.community_groups
        on community_groups.id = community_memberships.group_id
      where community_memberships.user_id = (select auth.uid())
        and community_memberships.group_id = community_messages.group_id
        and community_groups.active
    )
    and not exists (
      select 1
      from public.community_blocks
      where blocker_id = (select auth.uid())
        and blocked_user_id = community_messages.user_id
    )
  );

drop policy "Group members can send messages as themselves"
  on public.community_messages;

create policy "Active group members can send messages as themselves"
  on public.community_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.community_memberships
      join public.community_groups
        on community_groups.id = community_memberships.group_id
      where community_memberships.user_id = (select auth.uid())
        and community_memberships.group_id = community_messages.group_id
        and community_groups.active
    )
  );

drop policy "Group members can see their sector presence" on realtime.messages;
drop policy "Group members can publish their sector presence" on realtime.messages;

create policy "Active group members can see sector presence"
  on realtime.messages for select to authenticated
  using (
    extension = 'presence'
    and exists (
      select 1
      from public.community_memberships
      join public.community_groups
        on community_groups.id = community_memberships.group_id
      where community_memberships.user_id = (select auth.uid())
        and ('sector-' || community_groups.id) = (select realtime.topic())
        and community_groups.active
    )
  );

create policy "Active group members can publish sector presence"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and exists (
      select 1
      from public.community_memberships
      join public.community_groups
        on community_groups.id = community_memberships.group_id
      where community_memberships.user_id = (select auth.uid())
        and ('sector-' || community_groups.id) = (select realtime.topic())
        and community_groups.active
    )
  );

create table public.community_membership_requests (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id text not null references public.community_groups (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  unique (user_id, group_id)
);

create index community_membership_requests_status_created_idx
  on public.community_membership_requests (status, created_at desc);

alter table public.community_membership_requests enable row level security;
grant select on public.community_membership_requests to authenticated;
grant usage, select on sequence public.community_membership_requests_id_seq to authenticated;

create policy "Users can view their own membership requests"
  on public.community_membership_requests for select to authenticated
  using (user_id = (select auth.uid()));

drop function public.join_community_group(text);

create function public.join_community_group(requested_group_id text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  membership_count integer;
begin
  if auth.uid() is null then
    raise exception 'Sign in before joining a group.';
  end if;

  if not exists (
    select 1 from public.community_groups
    where id = requested_group_id and active
  ) then
    raise exception 'That community group is not available.';
  end if;

  if exists (
    select 1 from public.community_memberships
    where user_id = auth.uid() and group_id = requested_group_id
  ) then
    return 'already_member';
  end if;

  select count(*) into membership_count
  from public.community_memberships
  where user_id = auth.uid();

  if membership_count = 0 then
    insert into public.community_memberships (user_id, group_id)
    values (auth.uid(), requested_group_id);
    return 'joined';
  end if;

  insert into public.community_membership_requests (user_id, group_id, status, created_at, reviewed_at)
  values (auth.uid(), requested_group_id, 'pending', now(), null)
  on conflict (user_id, group_id)
  do update set status = 'pending', created_at = now(), reviewed_at = null;
  return 'requested';
end;
$$;

drop function public.leave_community_group();

create function public.leave_community_group(requested_group_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Sign in before leaving a group.';
  end if;

  delete from public.community_memberships
  where user_id = auth.uid()
    and group_id = requested_group_id;
end;
$$;

revoke all on function public.join_community_group(text) from public, anon;
revoke all on function public.leave_community_group(text) from public, anon;
grant execute on function public.join_community_group(text) to authenticated;
grant execute on function public.leave_community_group(text) to authenticated;

create table public.community_direct_messages (
  id bigint generated always as identity primary key,
  user_a_id uuid not null references auth.users (id) on delete cascade,
  user_b_id uuid references auth.users (id) on delete cascade,
  sender_id uuid references auth.users (id) on delete cascade,
  recipient_id uuid references auth.users (id) on delete cascade,
  sender_is_admin boolean not null default false,
  group_id text references public.community_groups (id) on delete set null,
  body text not null check (char_length(btrim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  check (user_b_id is null or user_a_id <> user_b_id),
  check (
    (sender_is_admin and sender_id is null and recipient_id = user_a_id and user_b_id is null)
    or (
      not sender_is_admin
      and sender_id is not null
      and (
        (user_b_id is not null and recipient_id is not null and sender_id in (user_a_id, user_b_id) and recipient_id in (user_a_id, user_b_id) and sender_id <> recipient_id)
        or (user_b_id is null and sender_id = user_a_id and recipient_id is null)
      )
    )
  )
);

create index community_direct_messages_user_a_created_idx
  on public.community_direct_messages (user_a_id, created_at desc);

create index community_direct_messages_user_b_created_idx
  on public.community_direct_messages (user_b_id, created_at desc);

create function public.enforce_direct_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.sender_id is not null then
    perform pg_advisory_xact_lock(hashtextextended(new.sender_id::text, 1));
    if (
      select count(*)
      from public.community_direct_messages
      where sender_id = new.sender_id
        and created_at > now() - interval '30 seconds'
    ) >= 5 then
      raise exception 'Direct message rate limit reached. Wait before sending another message.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function public.enforce_direct_message_rate() from public, anon, authenticated;

create trigger community_direct_messages_rate_limit
  before insert on public.community_direct_messages
  for each row execute function public.enforce_direct_message_rate();

alter table public.community_direct_messages enable row level security;
grant select, insert on public.community_direct_messages to authenticated;
grant usage, select on sequence public.community_direct_messages_id_seq to authenticated;

create function public.has_admin_direct_message_thread(requested_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_direct_messages
    where user_a_id = requested_user_id
      and user_b_id is null
      and sender_is_admin
  );
$$;

revoke all on function public.has_admin_direct_message_thread(uuid) from public, anon;
grant execute on function public.has_admin_direct_message_thread(uuid) to authenticated;

create policy "Direct message participants can read their conversations"
  on public.community_direct_messages for select to authenticated
  using (
    (user_a_id = (select auth.uid()) or user_b_id = (select auth.uid()))
    and (
      user_b_id is null
      or not exists (
        select 1
        from public.community_blocks
        where (blocker_id = user_a_id and blocked_user_id = user_b_id)
          or (blocker_id = user_b_id and blocked_user_id = user_a_id)
      )
    )
  );

create policy "Learners can message other members of their community"
  on public.community_direct_messages for insert to authenticated
  with check (
    not sender_is_admin
    and sender_id = (select auth.uid())
    and (
      recipient_id is null
      or not exists (
        select 1
        from public.community_blocks
        where (blocker_id = sender_id and blocked_user_id = recipient_id)
          or (blocker_id = recipient_id and blocked_user_id = sender_id)
      )
    )
    and (
      (
        user_b_id is not null
        and recipient_id is not null
        and recipient_id <> (select auth.uid())
        and sender_id in (user_a_id, user_b_id)
        and recipient_id in (user_a_id, user_b_id)
        and group_id is not null
        and (select public.is_community_group_member(group_id))
        and exists (
          select 1 from public.community_memberships
          where user_id = recipient_id and group_id = community_direct_messages.group_id
        )
      )
      or (
        user_a_id = (select auth.uid())
        and user_b_id is null
        and recipient_id is null
        and (select public.has_admin_direct_message_thread((select auth.uid())))
      )
    )
  );

create policy "Learners can receive private direct message updates"
  on realtime.messages for select to authenticated
  using (
    extension = 'postgres_changes'
    and (select realtime.topic()) = 'dm-' || (select auth.uid())::text
  );

create table public.activity_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  event_type text not null check (event_type in ('page_view', 'course_view', 'lesson_complete')),
  page_path text not null check (char_length(page_path) between 1 and 300),
  item_id text check (item_id is null or char_length(item_id) <= 180),
  title text check (title is null or char_length(title) <= 240),
  created_at timestamptz not null default now()
);

create index activity_events_user_created_idx
  on public.activity_events (user_id, created_at desc);

create index activity_events_type_created_idx
  on public.activity_events (event_type, created_at desc);

alter table public.activity_events enable row level security;
grant select, insert, delete on public.activity_events to authenticated;
grant usage, select on sequence public.activity_events_id_seq to authenticated;

create policy "Learners can read their own study activity"
  on public.activity_events for select to authenticated
  using (user_id = (select auth.uid()));

create policy "Tracking-enabled learners can record their own activity"
  on public.activity_events for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1 from public.community_profiles
      where id = (select auth.uid())
        and activity_tracking_enabled
    )
  );

create policy "Learners can delete their own study activity"
  on public.activity_events for delete to authenticated
  using (user_id = (select auth.uid()));

create table public.platform_visit_counts (
  visit_date date not null default current_date,
  page_path text not null,
  visit_count bigint not null default 0,
  primary key (visit_date, page_path)
);

alter table public.platform_visit_counts enable row level security;
revoke all on public.platform_visit_counts from public, anon, authenticated;
grant select on public.platform_visit_counts to service_role;

create function public.record_platform_visit(requested_page_path text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if requested_page_path not in (
    '/', '/index.html', '/learning-hub.html', '/course.html',
    '/api-studio.html', '/module-compiler.html', '/community.html', '/sources.html'
  ) then
    raise exception 'Unsupported page path.';
  end if;

  insert into public.platform_visit_counts (visit_date, page_path, visit_count)
  values (current_date, requested_page_path, 1)
  on conflict (visit_date, page_path)
  do update set visit_count = public.platform_visit_counts.visit_count + 1;
end;
$$;

revoke all on function public.record_platform_visit(text) from public;
grant execute on function public.record_platform_visit(text) to anon, authenticated;

create function public.admin_dashboard_summary()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'users', (select count(*) from public.community_profiles),
    'communities', (select count(*) from public.community_groups where active),
    'memberships', (select count(*) from public.community_memberships),
    'pendingRequests', (select count(*) from public.community_membership_requests where status = 'pending'),
    'trackedEvents', (select count(*) from public.activity_events),
    'visits', (select coalesce(sum(visit_count), 0) from public.platform_visit_counts),
    'activeLearners7d', (
      select count(distinct user_id)
      from public.activity_events
      where created_at >= now() - interval '7 days'
    ),
    'recentVisits', (
      select coalesce(jsonb_agg(to_jsonb(daily) order by daily.visit_date), '[]'::jsonb)
      from (
        select visit_date, sum(visit_count) as visits
        from public.platform_visit_counts
        where visit_date >= current_date - 6
        group by visit_date
      ) daily
    ),
    'popularPages', (
      select coalesce(jsonb_agg(to_jsonb(page) order by page.visits desc), '[]'::jsonb)
      from (
        select page_path, sum(visit_count) as visits
        from public.platform_visit_counts
        where visit_date >= current_date - 29
        group by page_path
        order by visits desc
        limit 8
      ) page
    )
  );
$$;

revoke all on function public.admin_dashboard_summary() from public, anon, authenticated;
grant execute on function public.admin_dashboard_summary() to service_role;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_direct_messages'
  ) then
    alter publication supabase_realtime add table public.community_direct_messages;
  end if;
end;
$$;
