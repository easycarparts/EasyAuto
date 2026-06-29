-- Per-listing control for the lead-capture banner on individual /business pages.
--
-- The adaptive funnel shows on listing pages by default (that's where ~99% of
-- traffic lands). Claimed owners (and, later, paying customers) can switch it off
-- for their own listing from the dashboard. Default true = show.

alter table businesses add column if not exists lead_ads_enabled boolean not null default true;

-- Reload PostgREST so select('*') returns the new column right away (STATUS.md gotcha #1).
notify pgrst, 'reload schema';
