-- Per-business blog / SEO articles (owner-authored, stored in Supabase).
-- Public reads: published posts on published listings only. Writes via service_role.

create table if not exists business_posts (
  id               uuid primary key default gen_random_uuid(),
  business_id      bigint not null references businesses(id) on delete cascade,
  slug             text not null,
  title            text not null,
  excerpt          text,
  content          text,
  cover_image_url  text,
  cover_image_alt  text,
  meta_title       text,
  meta_description text,
  og_image_url     text,
  author_name      text,
  noindex          boolean not null default false,
  status           text not null default 'draft',  -- draft | publish
  published_at     timestamptz,
  created_by       uuid references profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (business_id, slug)
);

create index if not exists business_posts_business_idx on business_posts (business_id, status, published_at desc);
create index if not exists business_posts_slug_idx on business_posts (business_id, slug);

alter table business_posts enable row level security;
drop policy if exists "posts public read published" on business_posts;
create policy "posts public read published" on business_posts
  for select using (
    status = 'publish'
    and exists (
      select 1 from businesses b
      where b.id = business_posts.business_id and b.status = 'publish'
    )
  );
