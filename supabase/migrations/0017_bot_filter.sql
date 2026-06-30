-- Behavioural bot filter. UA filtering misses scrapers/headless clients that use
-- a real Chrome UA, so we classify on BEHAVIOUR instead: a session is "human"
-- only if it shows an engagement signal. Everything else (single page, ~0s, no
-- scroll, no action — the "0-second views") is treated as automated and excluded
-- from the dashboard. Applied at query time, so it works on existing data too and
-- needs no backfill.
--
-- A session is HUMAN if any of:
--   * a pageview lasted >= 3s, or
--   * it scrolled >= 10%, or
--   * it has >= 2 pageviews, or
--   * it produced a lead or a custom event (CTA click / form / signup).

create or replace function analytics_is_human(p_sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from analytics_pageviews p where p.session_id = p_sid) >= 2
    or exists (
      select 1 from analytics_pageviews p
      where p.session_id = p_sid
        and (coalesce(p.duration_ms, 0) >= 3000 or coalesce(p.max_scroll_pct, 0) >= 10)
    )
    or exists (select 1 from leads l where l.session_id = p_sid)
    or exists (select 1 from analytics_events e where e.session_id = p_sid);
$$;

-- How many sessions were filtered out as automated, for dashboard transparency.
create or replace function analytics_excluded_bots(p_from timestamptz, p_to timestamptz)
returns bigint
language sql stable security definer set search_path = public as $$
  select count(*)
  from analytics_sessions sess
  where sess.created_at >= p_from and sess.created_at <= p_to
    and not analytics_is_human(sess.id);
$$;

-- Re-create the session-based RPCs with the human filter added. ----------------

create or replace function analytics_overview_v2(
  p_from timestamptz, p_to timestamptz,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null
)
returns table (
  visitors bigint, new_visitors bigint, sessions bigint, pageviews bigint,
  avg_session_sec numeric, avg_pages numeric, bounce_rate numeric,
  leads_total bigint, conversion_rate numeric
)
language sql security definer set search_path = public as $$
  with s as (
    select sess.id, sess.visitor_id, sess.is_returning,
           extract(epoch from (sess.last_seen_at - sess.created_at)) as dur,
           count(distinct pv.id) as views,
           count(distinct l.id) filter (where l.lead_type = 'form') as lead_ct
    from analytics_sessions sess
    left join analytics_pageviews pv on pv.session_id = sess.id
    left join leads l on l.session_id = sess.id
    where sess.created_at >= p_from and sess.created_at <= p_to
      and analytics_is_human(sess.id)
      and (p_device   is null or sess.device_type = p_device)
      and (p_country  is null or sess.country = p_country)
      and (p_source   is null or coalesce(nullif(sess.referrer_host,''),'Direct') = p_source)
      and (p_path     is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.path ilike '%'||p_path||'%'))
      and (p_business is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.business_slug = p_business))
    group by sess.id, sess.visitor_id, sess.is_returning, sess.last_seen_at, sess.created_at
  )
  select
    count(distinct visitor_id),
    count(distinct visitor_id) filter (where not is_returning),
    count(*),
    coalesce(sum(views),0),
    round(coalesce(avg(dur),0)::numeric,1),
    round(coalesce(avg(views),0)::numeric,2),
    round(coalesce(avg((views<=1)::int)*100,0)::numeric,1),
    coalesce(sum(lead_ct),0),
    case when count(*)=0 then 0 else round(coalesce(sum(lead_ct),0)::numeric/count(*)*100,1) end
  from s;
$$;

create or replace function analytics_timeseries_v2(
  p_from timestamptz, p_to timestamptz, p_granularity text default 'day',
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null
)
returns table (
  bucket date, visitors bigint, new_visitors bigint, sessions bigint,
  pageviews bigint, leads bigint, avg_sec numeric
)
language sql security definer set search_path = public as $$
  with s as (
    select sess.id, sess.visitor_id, sess.is_returning, sess.created_at,
           extract(epoch from (sess.last_seen_at - sess.created_at)) as dur,
           count(distinct pv.id) as views,
           count(distinct l.id) filter (where l.lead_type = 'form') as lead_ct
    from analytics_sessions sess
    left join analytics_pageviews pv on pv.session_id = sess.id
    left join leads l on l.session_id = sess.id
    where sess.created_at >= p_from and sess.created_at <= p_to
      and analytics_is_human(sess.id)
      and (p_device   is null or sess.device_type = p_device)
      and (p_country  is null or sess.country = p_country)
      and (p_source   is null or coalesce(nullif(sess.referrer_host,''),'Direct') = p_source)
      and (p_path     is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.path ilike '%'||p_path||'%'))
      and (p_business is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.business_slug = p_business))
    group by sess.id, sess.visitor_id, sess.is_returning, sess.created_at, sess.last_seen_at
  )
  select
    (date_trunc(case when p_granularity in ('day','week','month') then p_granularity else 'day' end,
                created_at at time zone 'Asia/Dubai'))::date as bucket,
    count(distinct visitor_id),
    count(distinct visitor_id) filter (where not is_returning),
    count(*),
    coalesce(sum(views),0),
    coalesce(sum(lead_ct),0),
    round(coalesce(avg(dur),0)::numeric,1)
  from s group by 1 order by 1;
$$;

create or replace function analytics_filtered_sessions(
  p_from timestamptz, p_to timestamptz,
  p_device text, p_country text, p_source text, p_path text, p_business text
)
returns table (id uuid)
language sql security definer set search_path = public as $$
  select sess.id
  from analytics_sessions sess
  where sess.created_at >= p_from and sess.created_at <= p_to
    and analytics_is_human(sess.id)
    and (p_device   is null or sess.device_type = p_device)
    and (p_country  is null or sess.country = p_country)
    and (p_source   is null or coalesce(nullif(sess.referrer_host,''),'Direct') = p_source)
    and (p_path     is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.path ilike '%'||p_path||'%'))
    and (p_business is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.business_slug = p_business));
$$;

-- Funnel: count only human listing views.
create or replace function analytics_funnel(p_from timestamptz, p_to timestamptz)
returns table (listing_views bigint, cta_clicks bigint, form_submits bigint, won bigint)
language sql security definer set search_path = public as $$
  select
    (select count(*) from analytics_pageviews pv
       where pv.created_at >= p_from and pv.created_at <= p_to
         and pv.business_slug is not null and analytics_is_human(pv.session_id)),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to
         and lead_type in ('whatsapp', 'call', 'directions_maps', 'directions_waze')),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to and lead_type = 'form'),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to and status = 'won');
$$;

notify pgrst, 'reload schema';
