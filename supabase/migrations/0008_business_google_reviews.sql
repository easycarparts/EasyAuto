-- Cached Google review text (fetched on admin-approved refresh; owners pick up to 5).

create table if not exists business_google_reviews (
  id                uuid primary key default gen_random_uuid(),
  business_id       bigint not null references businesses(id) on delete cascade,
  google_review_id  text not null,
  author_name       text,
  author_photo_url  text,
  author_uri        text,
  rating            smallint,
  text              text not null,
  relative_time     text,
  published_at      timestamptz,
  featured          boolean not null default false,
  sort_order        int not null default 0,
  fetched_at        timestamptz not null default now(),
  unique (business_id, google_review_id)
);

create index if not exists business_google_reviews_business_idx
  on business_google_reviews (business_id, sort_order);
create index if not exists business_google_reviews_featured_idx
  on business_google_reviews (business_id, featured)
  where featured = true;

alter table business_google_reviews enable row level security;
drop policy if exists "google reviews public read" on business_google_reviews;
create policy "google reviews public read" on business_google_reviews for select using (true);
