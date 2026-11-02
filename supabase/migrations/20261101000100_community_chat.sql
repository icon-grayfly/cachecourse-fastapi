create table public.community_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 40),
  created_at timestamptz not null default now()
);

create table public.community_messages (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.community_profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index community_messages_created_at_idx on public.community_messages (created_at desc);
create index community_messages_user_id_created_at_idx on public.community_messages (user_id, created_at desc);

create table public.community_blocks (
  blocker_id uuid not null references auth.users (id) on delete cascade,
  blocked_user_id uuid not null references public.community_profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_user_id),
  check (blocker_id <> blocked_user_id)
);

create table public.community_reports (
  id bigint generated always as identity primary key,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  message_id bigint references public.community_messages (id) on delete set null,
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  created_at timestamptz not null default now()
);

create table public.community_moderators (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create function public.is_community_moderator()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.community_moderators
    where user_id = (select auth.uid())
  );
$$;

revoke all on function public.is_community_moderator() from public, anon;
grant execute on function public.is_community_moderator() to authenticated;

create function public.create_community_profile()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := btrim(coalesce(new.raw_user_meta_data ->> 'display_name', 'Learner'));
  insert into public.community_profiles (id, display_name)
  values (
    new.id,
    case
      when char_length(requested_name) between 2 and 40 then requested_name
      else 'Learner'
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created_community_profile
  after insert on auth.users
  for each row execute function public.create_community_profile();

create function public.enforce_community_message_rate()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  rate_limit_user_id uuid;
begin
  rate_limit_user_id := coalesce(auth.uid(), new.user_id);
  perform pg_advisory_xact_lock(hashtextextended(rate_limit_user_id::text, 0));
  if (
    select count(*)
    from public.community_messages
    where user_id = rate_limit_user_id
      and created_at > now() - interval '30 seconds'
  ) >= 5 then
    raise exception 'Message rate limit reached. Wait before sending another message.';
  end if;
  return new;
end;
$$;

create trigger community_messages_rate_limit
  before insert on public.community_messages
  for each row execute function public.enforce_community_message_rate();

alter table public.community_profiles enable row level security;
alter table public.community_messages enable row level security;
alter table public.community_blocks enable row level security;
alter table public.community_reports enable row level security;
alter table public.community_moderators enable row level security;

grant select on public.community_profiles to authenticated;
grant update (display_name) on public.community_profiles to authenticated;
grant select, insert, delete on public.community_messages to authenticated;
grant select, insert, delete on public.community_blocks to authenticated;
grant insert, select on public.community_reports to authenticated;
grant usage, select on sequence public.community_messages_id_seq to authenticated;
grant usage, select on sequence public.community_reports_id_seq to authenticated;

create policy "Signed-in users can read community profiles"
  on public.community_profiles for select to authenticated
  using (true);

create policy "Users can update their own display name"
  on public.community_profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy "Signed-in users can read messages not blocked by them"
  on public.community_messages for select to authenticated
  using (
    not exists (
      select 1
      from public.community_blocks
      where blocker_id = (select auth.uid())
        and blocked_user_id = community_messages.user_id
    )
  );

create policy "Users can send messages as themselves"
  on public.community_messages for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "Moderators can remove messages"
  on public.community_messages for delete to authenticated
  using ((select public.is_community_moderator()));

create policy "Users can read their own blocks"
  on public.community_blocks for select to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users can block other accounts"
  on public.community_blocks for insert to authenticated
  with check (blocker_id = (select auth.uid()) and blocker_id <> blocked_user_id);

create policy "Users can unblock accounts"
  on public.community_blocks for delete to authenticated
  using (blocker_id = (select auth.uid()));

create policy "Users can report messages"
  on public.community_reports for insert to authenticated
  with check (reporter_id = (select auth.uid()));

create policy "Moderators can review reports"
  on public.community_reports for select to authenticated
  using ((select public.is_community_moderator()));

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'community_messages'
  ) then
    alter publication supabase_realtime add table public.community_messages;
  end if;
end;
$$;
