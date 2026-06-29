-- Multi-service discovery: tag each business with every service it offers, so a
-- shop that does PPF + ceramic + detailing appears under all three. A GIN-indexed
-- text[] is the read-friendly index for hub + location queries (one row per
-- business, no join dedup). category_slug stays as the "primary" for breadcrumbs.

alter table businesses add column if not exists service_tags text[] not null default '{}';
create index if not exists businesses_service_tags_idx on businesses using gin (service_tags);

-- The two services that had no category at all (PPF + ceramic were buried in
-- detailing/wrapping).
insert into categories (slug, name, listing_count) values
  ('paint-protection-film', 'Paint Protection Film (PPF)', 0),
  ('ceramic-coating-service', 'Ceramic Coating', 0)
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
