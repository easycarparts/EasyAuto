-- Lead-capture funnel (adaptive form on service / location / brand pages).
--
-- The `leads` table already carries name/phone/email/message/action/source. This
-- migration adds the attribution + workflow columns the adaptive funnel needs so a
-- single form on any page records WHICH service/location it came from and can be
-- worked as an inbox in the admin panel.
--
-- RLS is unchanged: anon may INSERT (the public form), only the service_role may
-- SELECT/UPDATE (admin inbox). Status updates go through an admin server action.

alter table leads add column if not exists service_slug  text;  -- e.g. 'paint-protection-film'
alter table leads add column if not exists location_slug text;  -- e.g. 'dubai' (nullable)
alter table leads add column if not exists lead_type     text;  -- 'form' | 'whatsapp' | 'call'
alter table leads add column if not exists status        text not null default 'new'; -- new|contacted|won|lost

create index if not exists leads_status_idx  on leads (status);
create index if not exists leads_service_idx on leads (service_slug);

-- Backfill: existing rows are click events, not form submissions.
update leads set lead_type = coalesce(lead_type, action) where lead_type is null;

-- Reload PostgREST so the data API sees the new columns immediately (see STATUS.md gotcha #1).
notify pgrst, 'reload schema';
