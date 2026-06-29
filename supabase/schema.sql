-- Easy Auto — Supabase schema
-- Run this in Supabase → SQL Editor before importing data.
-- Modeled directly from the WordPress export (post_type "business", 4,535 listings).

-- ---------------------------------------------------------------------------
-- CATEGORIES  (from the "business-category" taxonomy, e.g. car-wash, towing-service)
-- ---------------------------------------------------------------------------
create table if not exists categories (
  slug          text primary key,          -- nicename, e.g. "car-wash"  -> /business-category/car-wash/
  name          text not null,             -- "Car Wash"
  listing_count integer default 0
);

-- ---------------------------------------------------------------------------
-- BUSINESSES  (the listings)
-- ---------------------------------------------------------------------------
create table if not exists businesses (
  id             bigint primary key,        -- original WordPress post_id (keeps a stable link)
  slug           text unique not null,      -- post_name -> /business/<slug>/  (MUST match old URL for SEO)
  name           text not null,
  description    text,
  category_slug  text references categories(slug),
  rating         numeric(2,1),
  review_count   integer,                   -- _business_review_count
  google_reviews integer,                   -- _business_reviews_count (count shown on Google)
  address        text,
  city           text,
  state          text,
  zip            text,
  country        text,
  phone          text,
  email          text,
  website        text,
  social_links   jsonb,                      -- {instagram, facebook, x, linkedin, youtube, tiktok, whatsapp, snapchat}
  latitude       numeric(10,7),
  longitude      numeric(10,7),
  hours          text,
  place_id       text,                      -- Google Place ID
  google_link    text,
  review_keywords text,                     -- comma-separated keywords from reviews
  competitors    text,                      -- raw competitor block (kept for later parsing)
  thumbnail_url  text,                      -- resolved featured image URL
  original_thumbnail_url text,              -- import-time cover (Google/WordPress); restore target for owners
  claimed        boolean default false,
  featured       boolean default false,
  status         text default 'publish',
  easy_auto_score smallint,                 -- 0-100 quality score (completeness + dampened reputation + trust)
  score_breakdown jsonb,                    -- {completeness, reputation, trust, bayesian_rating, penalised}
  created_at     timestamptz,
  updated_at     timestamptz
);

create index if not exists businesses_category_idx on businesses (category_slug);
create index if not exists businesses_city_idx     on businesses (city);
-- Default ranking is by the Easy Auto score (highest first).
create index if not exists businesses_score_idx    on businesses (easy_auto_score desc nulls last);
-- For programmatic "category in city" pages and the search box:
create index if not exists businesses_search_idx
  on businesses using gin (to_tsvector('english', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'')));

-- ---------------------------------------------------------------------------
-- NEWS  (post_type "news" + a couple of legacy "post")
-- ---------------------------------------------------------------------------
create table if not exists news (
  id           bigint primary key,
  slug         text unique not null,        -- /news/<slug>/
  title        text not null,
  content      text,
  excerpt      text,
  thumbnail_url text,
  published_at timestamptz
);

-- ---------------------------------------------------------------------------
-- LEADS  (the whole point — capture intent from day one)
-- ---------------------------------------------------------------------------
create table if not exists leads (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz default now(),
  business_id   bigint references businesses(id),  -- which listing it came from (nullable)
  category_slug text,                               -- for attribution / reporting
  city          text,
  action        text,                               -- 'whatsapp' | 'call' | 'quote' | 'form'
  routed_to     text,                               -- 'own_service' | 'business' | etc.
  name          text,
  phone         text,
  email         text,
  message       text,
  source        text                                -- page/path or campaign the lead came from
);

create index if not exists leads_created_idx  on leads (created_at desc);
create index if not exists leads_category_idx on leads (category_slug);

-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
--   Public can READ listings/categories/news, and INSERT leads (so the funnel works).
--   Nobody but the service_role can READ leads or write to the catalog.
-- ---------------------------------------------------------------------------
alter table categories enable row level security;
alter table businesses enable row level security;
alter table news       enable row level security;
alter table leads      enable row level security;

create policy "public read categories" on categories for select using (true);
create policy "public read businesses" on businesses for select using (true);
create policy "public read news"       on news       for select using (true);

create policy "anyone can submit a lead" on leads for insert with check (true);
-- (no public SELECT policy on leads => only the service_role key can read them)
