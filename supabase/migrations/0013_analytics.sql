-- First-party, cookieless visitor analytics.
--
-- Two tables capture what the existing `leads` table never did: page views,
-- sessions, time-on-page, scroll depth and traffic sources. Identity is
-- anonymous — no raw IP, no persistent cookie. Unique visitors are counted via a
-- daily-rotating server-side hash (computed in /api/analytics/collect), session
-- continuity lives in the browser's sessionStorage. This keeps us clear of a
-- PDPL cookie-consent banner while still answering "who's on the site and what
-- are they doing".
--
-- RLS mirrors `leads`: NOTHING is granted to anon/authenticated here. The
-- collector writes with the service_role key, and the admin dashboard reads via
-- the service_role RPCs below (always behind requireAdmin()). The public never
-- touches these tables directly — unlike `leads`, there is no anon INSERT policy,
-- because the collector is a trusted server route, not the browser.

-- One row per visit (a sessionStorage-scoped browsing session). -----------------
create table if not exists analytics_sessions (
  id            uuid primary key,                 -- generated client-side (sessionStorage)
  visitor_hash  text,                             -- daily-rotating anon hash (unique-visitor key)
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now(),
  entry_path    text,
  referrer_host text,                             -- e.g. 'google.com' (null = direct)
  utm_source    text,
  utm_medium    text,
  utm_campaign  text,
  device_type   text,                             -- 'mobile' | 'tablet' | 'desktop'
  browser       text,
  os            text,
  country       text,                             -- ISO-2 from edge geo header
  city          text
);

create index if not exists analytics_sessions_created_idx  on analytics_sessions (created_at desc);
create index if not exists analytics_sessions_visitor_idx  on analytics_sessions (visitor_hash);

-- One row per page view, finalised on exit with duration + scroll depth. --------
create table if not exists analytics_pageviews (
  id             uuid primary key,                -- generated client-side (per view)
  session_id     uuid references analytics_sessions(id) on delete cascade,
  created_at     timestamptz not null default now(),
  path           text not null,
  business_slug  text,                            -- set for /business/{slug} views
  service_slug   text,
  location_slug  text,
  title          text,
  duration_ms    integer,                         -- filled by the exit beacon
  max_scroll_pct smallint                         -- 0-100, filled by the exit beacon
);

create index if not exists analytics_pageviews_created_idx  on analytics_pageviews (created_at desc);
create index if not exists analytics_pageviews_session_idx  on analytics_pageviews (session_id);
create index if not exists analytics_pageviews_path_idx     on analytics_pageviews (path);
create index if not exists analytics_pageviews_business_idx on analytics_pageviews (business_slug);

-- RLS on, no policies: only the service_role (which bypasses RLS) can read/write.
alter table analytics_sessions  enable row level security;
alter table analytics_pageviews enable row level security;

-- Aggregation RPCs --------------------------------------------------------------
-- Defined security definer so they run with the table owner's rights; the admin
-- dashboard calls them with the service_role client after requireAdmin(). All take
-- an inclusive [p_from, p_to] window.

-- Headline KPIs for the period (single row).
create or replace function analytics_overview(p_from timestamptz, p_to timestamptz)
returns table (
  visitors        bigint,
  sessions        bigint,
  pageviews       bigint,
  avg_session_sec numeric,
  avg_pages       numeric,
  bounce_rate     numeric,    -- % of sessions with exactly 1 pageview
  leads_total     bigint,
  conversion_rate numeric     -- form leads / sessions, %
)
language sql
security definer
set search_path = public
as $$
  with s as (
    select sess.id,
           sess.visitor_hash,
           extract(epoch from (sess.last_seen_at - sess.created_at)) as dur_sec,
           count(pv.id) as views
    from analytics_sessions sess
    left join analytics_pageviews pv on pv.session_id = sess.id
    where sess.created_at >= p_from and sess.created_at <= p_to
    group by sess.id, sess.visitor_hash, sess.last_seen_at, sess.created_at
  ),
  l as (
    select count(*) as form_leads
    from leads
    where created_at >= p_from and created_at <= p_to and lead_type = 'form'
  )
  select
    count(distinct s.visitor_hash)                                              as visitors,
    count(*)                                                                    as sessions,
    coalesce(sum(s.views), 0)                                                   as pageviews,
    round(coalesce(avg(s.dur_sec), 0)::numeric, 1)                             as avg_session_sec,
    round(coalesce(avg(s.views), 0)::numeric, 2)                               as avg_pages,
    round(coalesce(avg((s.views <= 1)::int) * 100, 0)::numeric, 1)            as bounce_rate,
    (select form_leads from l)                                                 as leads_total,
    case when count(*) = 0 then 0
         else round((select form_leads from l)::numeric / count(*) * 100, 1)
    end                                                                        as conversion_rate
  from s;
$$;

-- Daily visitors + pageviews trend.
create or replace function analytics_timeseries(p_from timestamptz, p_to timestamptz)
returns table (day date, visitors bigint, pageviews bigint)
language sql
security definer
set search_path = public
as $$
  select
    (sess.created_at at time zone 'Asia/Dubai')::date            as day,
    count(distinct sess.visitor_hash)                            as visitors,
    count(pv.id)                                                 as pageviews
  from analytics_sessions sess
  left join analytics_pageviews pv on pv.session_id = sess.id
  where sess.created_at >= p_from and sess.created_at <= p_to
  group by 1
  order by 1;
$$;

-- Most-viewed paths with average time on page and exit count.
create or replace function analytics_top_pages(p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table (path text, views bigint, avg_sec numeric, exits bigint)
language sql
security definer
set search_path = public
as $$
  with last_view as (   -- the final pageview of each session is its exit
    select distinct on (session_id) session_id, path
    from analytics_pageviews
    where created_at >= p_from and created_at <= p_to
    order by session_id, created_at desc
  )
  select
    pv.path,
    count(*)                                                     as views,
    round(coalesce(avg(pv.duration_ms), 0)::numeric / 1000, 1)  as avg_sec,
    count(lv.session_id)                                         as exits
  from analytics_pageviews pv
  left join last_view lv on lv.session_id = pv.session_id and lv.path = pv.path
  where pv.created_at >= p_from and pv.created_at <= p_to
  group by pv.path
  order by views desc
  limit p_limit;
$$;

-- Most-viewed business listings, joined to the live business name.
create or replace function analytics_top_businesses(p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table (business_slug text, name text, views bigint, avg_sec numeric)
language sql
security definer
set search_path = public
as $$
  select
    pv.business_slug,
    b.name,
    count(*)                                                     as views,
    round(coalesce(avg(pv.duration_ms), 0)::numeric / 1000, 1)  as avg_sec
  from analytics_pageviews pv
  left join businesses b on b.slug = pv.business_slug
  where pv.created_at >= p_from and pv.created_at <= p_to
    and pv.business_slug is not null
  group by pv.business_slug, b.name
  order by views desc
  limit p_limit;
$$;

-- Traffic sources by referrer host (null host = 'Direct').
create or replace function analytics_sources(p_from timestamptz, p_to timestamptz, p_limit int default 20)
returns table (referrer_host text, sessions bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(nullif(referrer_host, ''), 'Direct')               as referrer_host,
    count(*)                                                     as sessions
  from analytics_sessions
  where created_at >= p_from and created_at <= p_to
  group by 1
  order by sessions desc
  limit p_limit;
$$;

-- Generic session breakdown by a whitelisted dimension (device/browser/os/country).
create or replace function analytics_breakdown(p_from timestamptz, p_to timestamptz, p_dimension text)
returns table (label text, sessions bigint)
language sql
security definer
set search_path = public
as $$
  select
    coalesce(nullif(
      case p_dimension
        when 'device'  then device_type
        when 'browser' then browser
        when 'os'      then os
        when 'country' then country
      end, ''), 'Unknown')                                      as label,
    count(*)                                                     as sessions
  from analytics_sessions
  where created_at >= p_from and created_at <= p_to
  group by 1
  order by sessions desc;
$$;

-- Conversion funnel: listing views -> CTA clicks -> form submits -> won.
-- Clicks/forms/won come from `leads` (the existing event store); listing views
-- come from pageviews on /business/* paths.
create or replace function analytics_funnel(p_from timestamptz, p_to timestamptz)
returns table (listing_views bigint, cta_clicks bigint, form_submits bigint, won bigint)
language sql
security definer
set search_path = public
as $$
  select
    (select count(*) from analytics_pageviews
       where created_at >= p_from and created_at <= p_to and business_slug is not null),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to
         and lead_type in ('whatsapp', 'call', 'directions_maps', 'directions_waze')),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to and lead_type = 'form'),
    (select count(*) from leads
       where created_at >= p_from and created_at <= p_to and status = 'won');
$$;

-- Reload PostgREST so the data API sees the new tables + functions immediately.
notify pgrst, 'reload schema';
