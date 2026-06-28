// One-off: seed a published blog post for Grand Touch Studio from grandtouchauto.ae content.
// Usage: node scripts/seed-grand-touch-post.mjs

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const article = JSON.parse(readFileSync(resolve(root, ".tmp-gt-article.json"), "utf8"));

const env = {};
for (const line of readFileSync(resolve(root, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const BUSINESS_ID = 4427;
const now = new Date().toISOString();

const client = new pg.Client({
  connectionString: env.SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
});

await client.connect();

// Remove prior demo post with same slug if re-running
await client.query(
  `delete from business_posts where business_id = $1 and slug = $2`,
  [BUSINESS_ID, article.slug],
);

const { rows } = await client.query(
  `insert into business_posts (
    business_id, slug, title, excerpt, content,
    cover_image_url, cover_image_alt,
    meta_title, meta_description, og_image_url,
    author_name, noindex, status, published_at, created_at, updated_at
  ) values (
    $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,false,'publish',$12,$12,$12
  ) returning id, slug`,
  [
    BUSINESS_ID,
    article.slug,
    article.title,
    article.excerpt,
    article.content,
    article.cover_image_url,
    "PPF vs ceramic coating comparison for Dubai car owners — Grand Touch Studio",
    article.meta_title,
    article.meta_description,
    article.og_image_url,
    article.author_name,
    now,
  ],
);

console.log("Inserted post:", rows[0]);
await client.end();
