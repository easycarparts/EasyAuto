-- Step 1 — Auth + Submit / Claim / Manage business.
-- Adds owner accounts, claim requests, owner-uploaded media, and multi-category
-- support. Idempotent (safe to re-run). Apply via the session pooler:
--   node scripts/migrate.mjs supabase/migrations/0002_auth_owners.sql

-- ---------------------------------------------------------------------------
-- PROFILES  (1:1 with auth.users; auto-created on signup)
-- ---------------------------------------------------------------------------
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text,
  full_name  text,
  is_admin   boolean not null default false,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;
drop policy if exists "profiles read own"   on profiles;
drop policy if exists "profiles update own" on profiles;
create policy "profiles read own"   on profiles for select using (auth.uid() = id);
create policy "profiles update own" on profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Auto-provision a profile when a user signs up. The owner's address is seeded as
-- the site admin. SECURITY DEFINER so it can write past RLS.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, is_admin)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.email = 'hello@sgservices.ae'
  )
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- BUSINESSES — ownership + auto-id for new submissions + status-aware RLS
-- ---------------------------------------------------------------------------
alter table businesses add column if not exists owner_id uuid references profiles(id) on delete set null;
create index if not exists businesses_owner_idx on businesses (owner_id);

-- Original rows used the WordPress post_id as a manual id. New submissions need an
-- auto-generated id beyond the existing range.
create sequence if not exists businesses_id_seq owned by businesses.id;
select setval('businesses_id_seq', greatest((select coalesce(max(id), 1) from businesses), 1));
alter table businesses alter column id set default nextval('businesses_id_seq');

-- Public may only read PUBLISHED listings — pending submissions stay hidden from
-- the anon data layer automatically (no per-query status filter needed).
drop policy if exists "public read businesses" on businesses;
drop policy if exists "public read published businesses" on businesses;
create policy "public read published businesses" on businesses for select using (status = 'publish');

-- ---------------------------------------------------------------------------
-- CLAIM REQUESTS  (admin-approved ownership claims)
-- ---------------------------------------------------------------------------
create table if not exists claim_requests (
  id            uuid primary key default gen_random_uuid(),
  business_id   bigint not null references businesses(id) on delete cascade,
  user_id       uuid   not null references profiles(id)   on delete cascade,
  status        text   not null default 'pending',   -- pending | approved | rejected
  message       text,                                 -- proof / note from the claimant
  contact_phone text,
  contact_email text,
  decided_by    uuid references profiles(id),
  decided_at    timestamptz,
  created_at    timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists claim_requests_business_idx on claim_requests (business_id);
create index if not exists claim_requests_status_idx   on claim_requests (status);
-- RLS on, no policies: claims are read/written only through trusted server code
-- (service_role), which always scopes by the authenticated user.
alter table claim_requests enable row level security;

-- ---------------------------------------------------------------------------
-- BUSINESS MEDIA  (owner-uploaded photos + videos, hosted on Cloudinary)
-- ---------------------------------------------------------------------------
create table if not exists business_media (
  id            uuid primary key default gen_random_uuid(),
  business_id   bigint not null references businesses(id) on delete cascade,
  kind          text not null default 'image',  -- image | video
  url           text not null,
  thumbnail_url text,
  public_id     text,                            -- Cloudinary public_id (for later deletion)
  width         int,
  height        int,
  sort_order    int not null default 0,
  created_by    uuid references profiles(id),
  created_at    timestamptz not null default now()
);
create index if not exists business_media_business_idx on business_media (business_id, sort_order);
alter table business_media enable row level security;
drop policy if exists "media public read" on business_media;
create policy "media public read" on business_media for select using (true);
-- Writes go through server actions (service_role) after an ownership check.

-- ---------------------------------------------------------------------------
-- BUSINESS CATEGORIES  (multiple categories per business)
-- ---------------------------------------------------------------------------
create table if not exists business_categories (
  business_id   bigint not null references businesses(id) on delete cascade,
  category_slug text   not null references categories(slug) on delete cascade,
  primary key (business_id, category_slug)
);
create index if not exists business_categories_cat_idx on business_categories (category_slug);
alter table business_categories enable row level security;
drop policy if exists "biz_cats public read" on business_categories;
create policy "biz_cats public read" on business_categories for select using (true);

-- Backfill from the existing single category_slug so nothing regresses.
insert into business_categories (business_id, category_slug)
select id, category_slug from businesses
where category_slug is not null
on conflict do nothing;

-- Refresh PostgREST's schema cache so the new tables/columns are visible to the
-- data API immediately (see STATUS.md gotcha #1).
notify pgrst, 'reload schema';
