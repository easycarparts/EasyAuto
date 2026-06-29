-- Listing enrichment + quality (activate dormant listings).
-- AI-generated descriptions are staged in description_ai for review, then promoted
-- into description (original backed up). description_source tracks provenance.
-- Idempotent.

alter table businesses add column if not exists description_ai text;
alter table businesses add column if not exists original_description text;
alter table businesses add column if not exists description_source text default 'import';
-- 'import' = from the WordPress/scrape import, 'ai' = AI-enriched, 'owner' = owner-edited.

notify pgrst, 'reload schema';
