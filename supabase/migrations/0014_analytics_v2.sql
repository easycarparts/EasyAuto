-- Analytics v2: persistent (anonymous) visitor identity, lead↔session linking,
-- and a family of filterable, time-bucketed RPCs powering the GSC-style overview
-- and the sessions explorer.
--
-- Identity change: v1 counted uniques via a daily-rotating hash (cookieless but
-- over-counts repeat visitors across days). v2 adds visitor_id — a random
-- first-party id the browser keeps in localStorage — so monthly/yearly unique
-- visitors and new-vs-returning are truthful. Still no PII; it's an opaque token
-- scoped to this site only. The daily hash stays as a fallback.

alter table analytics_sessions add column if not exists visitor_id  text;
alter table analytics_sessions add column if not exists is_returning boolean not null default false;
create index if not exists analytics_sessions_visitorid_idx on analytics_sessions (visitor_id);
-- Backfill: treat each existing session's daily hash as its visitor identity.
update analytics_sessions set visitor_id = visitor_hash where visitor_id is null;

-- Link conversions to the session that produced them.
alter table leads add column if not exists session_id uuid;
create index if not exists leads_session_idx on leads (session_id);

-- A session is "matched" by the optional segment filters. Reused conceptually in
-- every function below; inlined because SQL functions can't share table CTEs.
-- Filters (all nullable → ignored when null):
--   p_device  = device_type      p_country = country
--   p_source  = referrer host ('Direct' for none)
--   p_path    = path contains    p_business = viewed business slug

-- Headline KPIs for the window (single row), honouring segment filters. -----------
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

-- Time series at day / week / month granularity. --------------------------------
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

-- Filtered session ids — a helper so the table RPCs share filter semantics.
create or replace function analytics_filtered_sessions(
  p_from timestamptz, p_to timestamptz,
  p_device text, p_country text, p_source text, p_path text, p_business text
)
returns table (id uuid)
language sql security definer set search_path = public as $$
  select sess.id
  from analytics_sessions sess
  where sess.created_at >= p_from and sess.created_at <= p_to
    and (p_device   is null or sess.device_type = p_device)
    and (p_country  is null or sess.country = p_country)
    and (p_source   is null or coalesce(nullif(sess.referrer_host,''),'Direct') = p_source)
    and (p_path     is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.path ilike '%'||p_path||'%'))
    and (p_business is null or exists (select 1 from analytics_pageviews x where x.session_id=sess.id and x.business_slug = p_business));
$$;

create or replace function analytics_top_pages_v2(
  p_from timestamptz, p_to timestamptz,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null, p_limit int default 25
)
returns table (path text, views bigint, avg_sec numeric, avg_scroll numeric, exits bigint)
language sql security definer set search_path = public as $$
  with fs as (select id from analytics_filtered_sessions(p_from,p_to,p_device,p_country,p_source,p_path,p_business)),
  last_view as (
    select distinct on (pv.session_id) pv.session_id, pv.path
    from analytics_pageviews pv join fs on fs.id = pv.session_id
    order by pv.session_id, pv.created_at desc
  )
  select pv.path,
         count(*),
         round(coalesce(avg(pv.duration_ms),0)::numeric/1000,1),
         round(coalesce(avg(pv.max_scroll_pct),0)::numeric,0),
         count(lv.session_id)
  from analytics_pageviews pv
  join fs on fs.id = pv.session_id
  left join last_view lv on lv.session_id = pv.session_id and lv.path = pv.path
  group by pv.path
  order by 2 desc
  limit p_limit;
$$;

create or replace function analytics_top_businesses_v2(
  p_from timestamptz, p_to timestamptz,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null, p_limit int default 20
)
returns table (business_slug text, name text, views bigint, avg_sec numeric)
language sql security definer set search_path = public as $$
  with fs as (select id from analytics_filtered_sessions(p_from,p_to,p_device,p_country,p_source,p_path,p_business))
  select pv.business_slug, b.name, count(*), round(coalesce(avg(pv.duration_ms),0)::numeric/1000,1)
  from analytics_pageviews pv
  join fs on fs.id = pv.session_id
  left join businesses b on b.slug = pv.business_slug
  where pv.business_slug is not null
  group by pv.business_slug, b.name
  order by 3 desc
  limit p_limit;
$$;

create or replace function analytics_sources_v2(
  p_from timestamptz, p_to timestamptz,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null, p_limit int default 20
)
returns table (referrer_host text, sessions bigint)
language sql security definer set search_path = public as $$
  with fs as (select id from analytics_filtered_sessions(p_from,p_to,p_device,p_country,p_source,p_path,p_business))
  select coalesce(nullif(sess.referrer_host,''),'Direct'), count(*)
  from analytics_sessions sess join fs on fs.id = sess.id
  group by 1 order by 2 desc limit p_limit;
$$;

create or replace function analytics_breakdown_v2(
  p_from timestamptz, p_to timestamptz, p_dimension text,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null
)
returns table (label text, sessions bigint)
language sql security definer set search_path = public as $$
  with fs as (select id from analytics_filtered_sessions(p_from,p_to,p_device,p_country,p_source,p_path,p_business))
  select coalesce(nullif(
    case p_dimension
      when 'device'    then sess.device_type
      when 'browser'   then sess.browser
      when 'os'        then sess.os
      when 'country'   then sess.country
      when 'returning' then case when sess.is_returning then 'Returning' else 'New' end
    end, ''), 'Unknown'),
    count(*)
  from analytics_sessions sess join fs on fs.id = sess.id
  group by 1 order by 2 desc;
$$;

-- Sessions explorer: paginated, filtered list of individual sessions. -----------
create or replace function analytics_sessions_list(
  p_from timestamptz, p_to timestamptz,
  p_device text default null, p_country text default null, p_source text default null,
  p_path text default null, p_business text default null,
  p_limit int default 50, p_offset int default 0
)
returns table (
  id uuid, created_at timestamptz, visitor_id text, is_returning boolean,
  entry_path text, referrer_host text, device_type text, country text, city text,
  page_count bigint, duration_sec numeric, lead_count bigint, total_rows bigint
)
language sql security definer set search_path = public as $$
  with fs as (select id from analytics_filtered_sessions(p_from,p_to,p_device,p_country,p_source,p_path,p_business)),
  agg as (
    select sess.id, sess.created_at, sess.visitor_id, sess.is_returning, sess.entry_path,
           sess.referrer_host, sess.device_type, sess.country, sess.city,
           count(distinct pv.id) as page_count,
           round(extract(epoch from (sess.last_seen_at - sess.created_at))::numeric,0) as duration_sec,
           count(distinct l.id) as lead_count
    from analytics_sessions sess
    join fs on fs.id = sess.id
    left join analytics_pageviews pv on pv.session_id = sess.id
    left join leads l on l.session_id = sess.id
    group by sess.id, sess.created_at, sess.visitor_id, sess.is_returning, sess.entry_path,
             sess.referrer_host, sess.device_type, sess.country, sess.city, sess.last_seen_at
  )
  select *, count(*) over() as total_rows
  from agg
  order by created_at desc
  limit p_limit offset p_offset;
$$;

notify pgrst, 'reload schema';
