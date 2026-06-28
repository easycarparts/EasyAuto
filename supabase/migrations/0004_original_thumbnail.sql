-- Preserve the listing's import-time cover image so owners can restore after changing it.
-- Backfill from the current thumbnail (the WordPress / Google-import image for existing rows).

alter table businesses add column if not exists original_thumbnail_url text;

update businesses
set original_thumbnail_url = thumbnail_url
where thumbnail_url is not null
  and original_thumbnail_url is null;
