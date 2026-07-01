-- Tighten the behavioural bot filter. The previous "any pageview >= 3s = human"
-- rule was too weak: headless bots idle on a page (especially /login, a common
-- probe target) long enough to pass, and the 4s engagement ping fed them a
-- duration. Idle time is not engagement.
--
-- Stronger, harder-to-fake rule. A session is HUMAN if any of:
--   * it scrolled >= 10%, or
--   * it viewed >= 2 pages (navigated), or
--   * it produced a lead or a custom event (CTA click / form / auth action), or
--   * a CONTENT page was viewed for >= 10s. Utility/auth pages (/login, /auth/*)
--     are excluded from the duration signal — nobody "reads" a login page, so
--     time spent there is meaningless and easily faked. Real signup intent on
--     those pages is captured by the auth events instead.

create or replace function analytics_is_human(p_sid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select
    (select count(*) from analytics_pageviews p where p.session_id = p_sid) >= 2
    or exists (
      select 1 from analytics_pageviews p
      where p.session_id = p_sid
        and (
          coalesce(p.max_scroll_pct, 0) >= 10
          or (
            coalesce(p.duration_ms, 0) >= 10000
            and p.path <> '/login'
            and p.path not like '/auth%'
          )
        )
    )
    or exists (select 1 from leads l where l.session_id = p_sid)
    or exists (select 1 from analytics_events e where e.session_id = p_sid);
$$;

notify pgrst, 'reload schema';
