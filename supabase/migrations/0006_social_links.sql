-- Owner-editable social profile links (Instagram, Facebook, X, etc.)
alter table businesses add column if not exists social_links jsonb;
