create or replace function public.admin_dashboard_summary()
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
    'trackedEvents7d', (
      select count(*)
      from public.activity_events
      where created_at >= now() - interval '7 days'
    ),
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
    'activityByDay', (
      select coalesce(jsonb_agg(to_jsonb(daily) order by daily.activity_date), '[]'::jsonb)
      from (
        select
          activity_day::date as activity_date,
          count(event.id) as events,
          count(distinct event.user_id) as learners
        from generate_series(
          (current_date - 6)::timestamp,
          current_date::timestamp,
          interval '1 day'
        ) as day_series(activity_day)
        left join public.activity_events as event
          on event.created_at >= day_series.activity_day
          and event.created_at < day_series.activity_day + interval '1 day'
        group by activity_day
      ) daily
    ),
    'activityByType', (
      select coalesce(jsonb_agg(to_jsonb(activity_type) order by activity_type.event_type), '[]'::jsonb)
      from (
        select
          event_type,
          count(*) as events,
          count(distinct user_id) as learners
        from public.activity_events
        where created_at >= now() - interval '7 days'
        group by event_type
      ) activity_type
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
