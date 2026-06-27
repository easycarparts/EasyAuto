// Extract Easy Auto data from the WordPress WXR export into clean JSON.
//
// Usage:
//   node scripts/extract-wordpress.mjs [path-to-export.xml]
//
// Default input: the export currently in Downloads. Override by passing a path
// or setting WP_XML. Outputs to ./data/{categories,businesses,news}.json
//
// No dependencies — parses the WXR with regex (the export structure is regular).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const INPUT =
  process.argv[2] ||
  process.env.WP_XML ||
  "C:/Users/seane/Downloads/easyauto.WordPress.2026-06-27.xml";
const OUT_DIR = resolve(ROOT, "data");

console.log(`Reading ${INPUT} ...`);
const xml = readFileSync(INPUT, "utf8");

// ---- helpers ---------------------------------------------------------------
function tag(block, name) {
  const re = new RegExp(
    `<${name}>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${name}>`
  );
  const m = block.match(re);
  if (!m) return null;
  const v = m[1] !== undefined ? m[1] : m[2];
  return v === undefined || v === "" ? null : v;
}

function metaMap(block) {
  const map = {};
  const re =
    /<wp:postmeta>\s*<wp:meta_key><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_key>\s*<wp:meta_value><!\[CDATA\[([\s\S]*?)\]\]><\/wp:meta_value>\s*<\/wp:postmeta>/g;
  let m;
  while ((m = re.exec(block))) map[m[1]] = m[2];
  return map;
}

const num = (v) => (v == null || v === "" ? null : Number(v));
const int = (v) => (v == null || v === "" ? null : parseInt(v, 10));
const bool = (v) => v === "1" || v === "yes" || v === "true";
const isoDate = (v) => (v ? v.trim().replace(" ", "T") + "Z" : null);

// ---- single pass over all <item> blocks ------------------------------------
const attachments = new Map(); // post_id -> url
const businessesRaw = [];
const news = [];
const categoryNames = new Map(); // slug -> name
const categoryCounts = new Map(); // slug -> count

const itemRe = /<item>([\s\S]*?)<\/item>/g;
let item;
let count = 0;
while ((item = itemRe.exec(xml))) {
  const block = item[1];
  const type = tag(block, "wp:post_type");
  count++;

  if (type === "attachment") {
    const id = int(tag(block, "wp:post_id"));
    const url = tag(block, "wp:attachment_url");
    if (id && url) attachments.set(id, url);
    continue;
  }

  if (type === "business") {
    const meta = metaMap(block);
    const catM = block.match(
      /<category domain="business-category" nicename="([^"]*)"><!\[CDATA\[([\s\S]*?)\]\]><\/category>/
    );
    const catSlug = catM ? catM[1] : null;
    const catName = catM ? catM[2] : null;
    if (catSlug) {
      categoryNames.set(catSlug, catName);
      categoryCounts.set(catSlug, (categoryCounts.get(catSlug) || 0) + 1);
    }
    businessesRaw.push({
      id: int(tag(block, "wp:post_id")),
      slug: tag(block, "wp:post_name"),
      name: tag(block, "title"),
      description: tag(block, "content:encoded"),
      category_slug: catSlug,
      rating: num(meta._business_rating),
      review_count: int(meta._business_review_count),
      google_reviews: int(meta._business_reviews_count),
      address: meta._business_address || null,
      city: meta._business_city || null,
      state: meta._business_state || null,
      zip: meta._business_zip || null,
      country: meta._business_country || null,
      phone: meta._business_phone || null,
      email:
        meta._business_email && meta._business_email !== "Email not available"
          ? meta._business_email
          : null,
      website: meta._business_website || null,
      latitude: num(meta._business_latitude),
      longitude: num(meta._business_longitude),
      hours: meta._business_hours || null,
      place_id: meta._business_place_id || null,
      google_link: meta._business_google_link || null,
      review_keywords: meta._business_review_keywords || null,
      competitors: meta._business_competitors || null,
      claimed: bool(meta._business_claimed),
      featured: bool(meta._business_featured),
      status: tag(block, "wp:status") || "publish",
      created_at: isoDate(tag(block, "wp:post_date_gmt")),
      updated_at: isoDate(tag(block, "wp:post_modified_gmt")),
      _thumbnail_id: int(meta._thumbnail_id),
    });
    continue;
  }

  if (type === "news" || type === "post") {
    news.push({
      id: int(tag(block, "wp:post_id")),
      slug: tag(block, "wp:post_name"),
      title: tag(block, "title"),
      content: tag(block, "content:encoded"),
      excerpt: tag(block, "excerpt:encoded"),
      published_at: isoDate(tag(block, "wp:post_date_gmt")),
      _thumbnail_id: int(metaMap(block)._thumbnail_id),
    });
  }
}

// ---- resolve thumbnails + finalize -----------------------------------------
const businesses = businessesRaw
  .filter((b) => b.id && b.slug && b.status === "publish")
  .map(({ _thumbnail_id, ...b }) => ({
    ...b,
    thumbnail_url: _thumbnail_id ? attachments.get(_thumbnail_id) || null : null,
  }));

const newsOut = news
  .filter((n) => n.id && n.slug)
  .map(({ _thumbnail_id, ...n }) => ({
    ...n,
    thumbnail_url: _thumbnail_id ? attachments.get(_thumbnail_id) || null : null,
  }));

const categories = [...categoryNames.entries()]
  .map(([slug, name]) => ({
    slug,
    name,
    listing_count: categoryCounts.get(slug) || 0,
  }))
  .sort((a, b) => b.listing_count - a.listing_count);

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(`${OUT_DIR}/categories.json`, JSON.stringify(categories, null, 2));
writeFileSync(`${OUT_DIR}/businesses.json`, JSON.stringify(businesses, null, 2));
writeFileSync(`${OUT_DIR}/news.json`, JSON.stringify(newsOut, null, 2));

console.log(`Scanned ${count} items.`);
console.log(`  categories: ${categories.length}`);
console.log(`  businesses: ${businesses.length}  (with image: ${businesses.filter((b) => b.thumbnail_url).length})`);
console.log(`  news:       ${newsOut.length}`);
console.log(`Wrote JSON to ${OUT_DIR}/`);
