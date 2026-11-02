create table public.community_groups (
  id text primary key,
  name text not null,
  summary text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.community_groups (id, name, summary) values
  ('banking-finance', 'Banking & Finance', 'Banking, financial services, accounting, insurance, and how people and businesses manage money.'),
  ('software-data', 'Software & Data', 'Software, data, digital products, information systems, and technology careers.'),
  ('oil-gas-energy', 'Oil, Gas & Energy', 'Energy, utilities, renewables, petroleum, and the transition to a more sustainable energy future.'),
  ('healthcare-life-sciences', 'Healthcare & Life Sciences', 'Healthcare, public health, life sciences, health technology, and care.'),
  ('education-research', 'Education & Research', 'Teaching, learning, research, academic pathways, and ways to share knowledge.'),
  ('business-entrepreneurship', 'Business & Entrepreneurship', 'Starting and growing businesses, operations, leadership, and new ideas.'),
  ('law-public-policy', 'Law & Public Policy', 'Legal careers, public service, policy, governance, and civic participation.'),
  ('media-communications', 'Media & Communications', 'Journalism, storytelling, content, design, public relations, and communication.'),
  ('engineering-manufacturing', 'Engineering & Manufacturing', 'Engineering, construction, manufacturing, infrastructure, and practical design.'),
  ('agriculture-environment', 'Agriculture & Environment', 'Agriculture, food systems, conservation, climate, and environmental work.');

alter table public.community_messages
  add column group_id text references public.community_groups (id) on delete cascade;

alter table public.community_reports
  add column group_id text references public.community_groups (id) on delete set null;

alter table public.community_messages
  add column removed_at timestamptz;

create index community_messages_group_created_idx
  on public.community_messages (group_id, created_at desc);

create table public.community_memberships (
  user_id uuid primary key references auth.users (id) on delete cascade,
  group_id text not null references public.community_groups (id) on delete cascade,
  joined_at timestamptz not null default now()
);

create index community_memberships_group_id_idx
  on public.community_memberships (group_id);

alter table public.community_groups enable row level security;
alter table public.community_memberships enable row level security;

grant select on public.community_groups to authenticated;
grant select on public.community_memberships to authenticated;

create policy "Signed-in users can browse active community groups"
  on public.community_groups for select to authenticated
  using (active);

create policy "Users can read their own sector membership"
  on public.community_memberships for select to authenticated
  using (user_id = (select auth.uid()));

drop policy "Signed-in users can read messages not blocked by them"
  on public.community_messages;
drop policy "Users can send messages as themselves"
  on public.community_messages;

create policy "Group members can read messages not blocked by them"
  on public.community_messages for select to authenticated
  using (
    exists (
      select 1
      from public.community_memberships
      where user_id = (select auth.uid())
        and group_id = community_messages.group_id
    )
    and not exists (
      select 1
      from public.community_blocks
      where blocker_id = (select auth.uid())
        and blocked_user_id = community_messages.user_id
    )
  );

create policy "Group members can send messages as themselves"
  on public.community_messages for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.community_memberships
      where user_id = (select auth.uid())
        and group_id = community_messages.group_id
    )
  );

drop policy "Moderators can remove messages"
  on public.community_messages;
revoke delete on public.community_messages from authenticated;
grant update (body, removed_at) on public.community_messages to authenticated;

create policy "Moderators can redact group messages"
  on public.community_messages for update to authenticated
  using (
    (select public.is_community_moderator())
    and removed_at is null
  )
  with check (
    (select public.is_community_moderator())
    and removed_at is not null
    and body = 'Message removed by a moderator.'
  );

drop policy "Users can report messages"
  on public.community_reports;
create policy "Group members can report group messages"
  on public.community_reports for insert to authenticated
  with check (
    reporter_id = (select auth.uid())
    and exists (
      select 1
      from public.community_messages
      join public.community_memberships
        on community_memberships.group_id = community_messages.group_id
      where community_messages.id = community_reports.message_id
        and community_messages.group_id = community_reports.group_id
        and community_messages.removed_at is null
        and community_memberships.user_id = (select auth.uid())
    )
  );

create function public.join_community_group(requested_group_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
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

  delete from public.community_memberships
  where user_id = auth.uid();

  insert into public.community_memberships (user_id, group_id)
  values (auth.uid(), requested_group_id);
end;
$$;

create function public.leave_community_group()
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
  where user_id = auth.uid();
end;
$$;

revoke all on function public.join_community_group(text) from public, anon;
revoke all on function public.leave_community_group() from public, anon;
grant execute on function public.join_community_group(text) to authenticated;
grant execute on function public.leave_community_group() to authenticated;

drop policy "Signed-in users can see lounge presence" on realtime.messages;
drop policy "Signed-in users can publish lounge presence" on realtime.messages;

create policy "Group members can see their sector presence"
  on realtime.messages for select to authenticated
  using (
    extension = 'presence'
    and exists (
      select 1
      from public.community_memberships
      where user_id = (select auth.uid())
        and ('sector-' || group_id) = (select realtime.topic())
    )
  );

create policy "Group members can publish their sector presence"
  on realtime.messages for insert to authenticated
  with check (
    extension = 'presence'
    and exists (
      select 1
      from public.community_memberships
      where user_id = (select auth.uid())
        and ('sector-' || group_id) = (select realtime.topic())
    )
  );
