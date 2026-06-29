-- Owner requests to refresh Google rating/review count (admin-approved; each approval
-- costs one Google Places API call, so never auto-run from the owner dashboard).

create table if not exists google_review_refresh_requests (
  id            uuid primary key default gen_random_uuid(),
  business_id   bigint not null references businesses(id) on delete cascade,
  user_id       uuid   not null references profiles(id) on delete cascade,
  status        text   not null default 'pending',  -- pending | approved | rejected
  message       text,
  decided_by    uuid references profiles(id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now()
);

create index if not exists google_review_refresh_business_idx
  on google_review_refresh_requests (business_id, created_at desc);
create index if not exists google_review_refresh_status_idx
  on google_review_refresh_requests (status);

-- One pending request per business at a time.
create unique index if not exists google_review_refresh_one_pending
  on google_review_refresh_requests (business_id)
  where status = 'pending';

alter table google_review_refresh_requests enable row level security;
