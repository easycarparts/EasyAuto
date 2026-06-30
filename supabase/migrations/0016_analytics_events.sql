-- Custom analytics events — a generic primitive beyond page views. Used first
-- for auth funnel tracking (signups, logins, OTP verifications) and the
-- app-side record of emails Resend sent (magic-link / confirmation / recovery),
-- but reusable for any future client-fired event.
--
-- Written by /api/analytics/collect (t:'event') with the service_role key; RLS
-- locked like the other analytics tables (admin reads via RPC only). Unlike page
-- views, auth events are NOT admin-excluded — we want every signup/login.

create table if not exists analytics_events (
  id          uuid primary key,            -- client-generated
  created_at  timestamptz not null default now(),
  session_id  uuid,                         -- analytics session (loose link to the journey)
  visitor_id  text,
  name        text not null,                -- 'signup_completed', 'login_completed', 'email_sent', …
  category    text,                         -- 'auth' | 'email' | …
  props       jsonb,                        -- { method, email_type, ok, reason, … }
  path        text
);

create index if not exists analytics_events_created_idx on analytics_events (created_at desc);
create index if not exists analytics_events_name_idx    on analytics_events (name);
create index if not exists analytics_events_session_idx on analytics_events (session_id);

alter table analytics_events enable row level security;

-- Event counts for a window, by name.
create or replace function analytics_event_counts(p_from timestamptz, p_to timestamptz)
returns table (name text, count bigint)
language sql security definer set search_path = public as $$
  select name, count(*)
  from analytics_events
  where created_at >= p_from and created_at <= p_to
  group by name
  order by 2 desc;
$$;

notify pgrst, 'reload schema';
