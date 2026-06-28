// Import Google-Maps-scraper CSV exports into the Easy Auto catalog.
//
// The scraper (e.g. googlemapsextractor / Outscraper) produces one row per place
// with the SAME field set the old WordPress theme stored. We match on `place_id`:
//   - place_id already in DB  -> REFRESH the Google-sourced fields (rating, reviews,
//     hours, image, keywords, competitors). Owner-editable fields on CLAIMED listings
//     are left alone so we never clobber a business's own edits.
//   - new place_id            -> INSERT a new listing (slug generated, id = max+1).
//
// The key win: `featured_image` is Google-hosted, so this also replaces the
// soon-to-be-dead easyauto.ae/wp-content thumbnails before domain cutover.
//
// Usage:
//   node scripts/import-scraper.mjs <folder-or-csv> [--push]
//     (no path)  -> defaults to ./data/scraper/
//     --push     -> write to Supabase (needs SUPABASE_SERVICE_ROLE_KEY in .env.local).
//                   Without it, runs DRY: writes ./data/scraper-import.json to inspect.
//
// No runtime deps (CSV parsed with a small state machine; Supabase via @supabase/supabase-js).

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// ---- args ------------------------------------------------------------------
const args = process.argv.slice(2);
const PUSH = args.includes("--push");
const inputArg = args.find((a) => !a.startsWith("--")) || "data/scraper";
const INPUT = resolve(ROOT, inputArg);

// ---- .env.local loader (only needed for --push) ----------------------------
try {
  for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* .env.local optional in dry mode */
}

// ---- tiny CSV parser (handles quoted, multiline, embedded-comma fields) -----
function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  // strip a leading BOM if present
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field); field = "";
    } else if (c === "\n") {
      row.push(field); field = "";
      rows.push(row); row = [];
    } else if (c === "\r") {
      // ignore; \n handles the row break
    } else field += c;
  }
  // trailing field / row
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  return rows;
}

function csvToObjects(text) {
  const rows = parseCsv(text).filter((r) => r.length > 1 || (r.length === 1 && r[0] !== ""));
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).map((r) => {
    const o = {};
    header.forEach((h, i) => { o[h] = r[i] ?? ""; });
    return o;
  });
}

// ---- field mapping helpers -------------------------------------------------
const clean = (v) => {
  if (v == null) return null;
  const t = String(v).trim();
  return t === "" ? null : t;
};
const intOrNull = (v) => {
  const t = clean(v);
  if (t == null) return null;
  const n = parseInt(t.replace(/[^\d-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
};
const ratingOrNull = (v) => {
  const t = clean(v);
  if (t == null) return null;
  const n = Number(t);
  // scraper writes 0 for "no rating" — treat as null
  return Number.isFinite(n) && n > 0 ? n : null;
};
const truthy = (v) => {
  const t = (clean(v) || "").toLowerCase();
  return t === "1" || t === "true" || t === "yes";
};

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 80);
}

// Pull coords + place_id out of the Google Maps `link` (!3d<lat>!4d<lng>).
function coordsFromLink(link) {
  if (!link) return { latitude: null, longitude: null };
  let full = link;
  try { full = decodeURIComponent(link); } catch { /* keep raw */ }
  const m = full.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  if (m) return { latitude: Number(m[1]), longitude: Number(m[2]) };
  const at = full.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (at) return { latitude: Number(at[1]), longitude: Number(at[2]) };
  return { latitude: null, longitude: null };
}

// Map one scraper row -> a normalized partial business (Google-sourced fields only).
function mapRow(r) {
  const place_id = clean(r.place_id);
  if (!place_id) return null;
  const name = clean(r.name);
  if (!name) return null;

  const { latitude, longitude } = coordsFromLink(r.link);
  const mainCat = clean(r.main_category);
  const allCats = (clean(r.categories) || mainCat || "")
    .split(",").map((c) => c.trim()).filter(Boolean);

  return {
    place_id,
    name,
    description: clean(r.description),
    rating: ratingOrNull(r.rating),
    google_reviews: intOrNull(r.reviews),
    address: clean(r.address),
    phone: clean(r.phone),
    website: clean(r.website),
    hours: clean(r.workday_timing),
    latitude,
    longitude,
    google_link: clean(r.link),
    review_keywords: clean(r.review_keywords),
    competitors: clean(r.competitors),
    thumbnail_url: clean(r.featured_image),
    is_closed: truthy(r.is_temporarily_closed),
    // taxonomy
    category_slug: mainCat ? slugify(mainCat) : null,
    category_name: mainCat,
    category_slugs: allCats.map((c) => ({ slug: slugify(c), name: c })),
    // provenance
    source_query: clean(r.query),
  };
}

// ---- gather CSV files ------------------------------------------------------
function listCsvFiles(p) {
  const st = statSync(p);
  if (st.isFile()) return [p];
  return readdirSync(p)
    .filter((f) => f.toLowerCase().endsWith(".csv"))
    .map((f) => join(p, f));
}

let files;
try {
  files = listCsvFiles(INPUT);
} catch {
  console.error(`No CSV input found at ${INPUT}. Pass a folder or .csv path.`);
  process.exit(1);
}
if (!files.length) { console.error(`No .csv files in ${INPUT}`); process.exit(1); }

console.log(`Reading ${files.length} CSV file(s) from ${inputArg} ...`);
const byPlace = new Map(); // place_id -> mapped row (last wins; dedup within batch)
let rawCount = 0;
for (const f of files) {
  const objs = csvToObjects(readFileSync(f, "utf8"));
  for (const o of objs) {
    rawCount++;
    const mapped = mapRow(o);
    if (mapped) byPlace.set(mapped.place_id, mapped);
  }
}
const rows = [...byPlace.values()];
console.log(`  parsed ${rawCount} rows -> ${rows.length} unique by place_id`);
console.log(`  with image: ${rows.filter((r) => r.thumbnail_url).length}`);
console.log(`  with rating: ${rows.filter((r) => r.rating != null).length}`);
console.log(`  with coords: ${rows.filter((r) => r.latitude != null).length}`);

// ---- dry mode: write inspectable JSON and stop -----------------------------
if (!PUSH) {
  const out = resolve(ROOT, "data", "scraper-import.json");
  writeFileSync(out, JSON.stringify(rows, null, 2));
  console.log(`\nDRY RUN — wrote ${rows.length} rows to data/scraper-import.json`);
  console.log("Re-run with --push to write to Supabase.");
  process.exit(0);
}

// ---- push mode: upsert into Supabase ---------------------------------------
const { createClient } = await import("@supabase/supabase-js");
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.includes("PASTE_YOUR_NEW")) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local — needed for --push.");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// Owner-editable fields we must NOT overwrite on a CLAIMED listing.
const OWNER_FIELDS = ["name", "description", "website", "phone", "hours"];
// Google-refresh fields safe to update on any unclaimed listing.
const REFRESH_FIELDS = [
  "rating", "google_reviews", "review_keywords", "competitors",
  "thumbnail_url", "google_link", "latitude", "longitude",
  ...OWNER_FIELDS,
];

// existing place_id -> { id, slug, claimed, thumbnail_url, original_thumbnail_url }
console.log("Loading existing place_id index ...");
const existing = new Map();
let maxId = 0;
{
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from("businesses")
      .select("id, slug, place_id, claimed, thumbnail_url, original_thumbnail_url")
      .range(from, from + page - 1);
    if (error) { console.error(error.message); process.exit(1); }
    if (!data?.length) break;
    for (const b of data) {
      if (b.place_id) existing.set(b.place_id, b);
      if (b.id > maxId) maxId = b.id;
    }
    if (data.length < page) break;
  }
}
console.log(`  ${existing.size} existing listings indexed (maxId=${maxId})`);

// Ensure categories referenced by new listings exist (FK on businesses.category_slug).
const catSet = new Map();
for (const r of rows) {
  if (r.category_slug && r.category_name) catSet.set(r.category_slug, r.category_name);
}
if (catSet.size) {
  const cats = [...catSet.entries()].map(([slug, name]) => ({ slug, name }));
  const { error } = await db.from("categories").upsert(cats, { onConflict: "slug", ignoreDuplicates: true });
  if (error) console.warn(`  category upsert warning: ${error.message}`);
}

const usedSlugs = new Set([...existing.values()].map((b) => b.slug));
function uniqueSlug(base) {
  let s = base || "listing";
  if (!usedSlugs.has(s)) { usedSlugs.add(s); return s; }
  for (let i = 2; ; i++) {
    const c = `${s}-${i}`;
    if (!usedSlugs.has(c)) { usedSlugs.add(c); return c; }
  }
}

const inserts = [];
const updates = [];
let nextId = maxId;
for (const r of rows) {
  const ex = existing.get(r.place_id);
  if (ex) {
    const patch = { id: ex.id };
    const fields = ex.claimed ? REFRESH_FIELDS.filter((f) => !OWNER_FIELDS.includes(f)) : REFRESH_FIELDS;
    for (const f of fields) if (r[f] != null) patch[f] = r[f];
    // keep an import-time original image if we're about to replace the thumbnail
    if (r.thumbnail_url && !ex.original_thumbnail_url) patch.original_thumbnail_url = ex.thumbnail_url ?? r.thumbnail_url;
    if (Object.keys(patch).length > 1) updates.push(patch);
  } else {
    nextId += 1;
    inserts.push({
      id: nextId,
      slug: uniqueSlug(slugify(r.name)),
      name: r.name,
      description: r.description,
      category_slug: r.category_slug,
      rating: r.rating,
      google_reviews: r.google_reviews,
      address: r.address,
      phone: r.phone,
      website: r.website,
      hours: r.hours,
      latitude: r.latitude,
      longitude: r.longitude,
      place_id: r.place_id,
      google_link: r.google_link,
      review_keywords: r.review_keywords,
      competitors: r.competitors,
      thumbnail_url: r.thumbnail_url,
      original_thumbnail_url: r.thumbnail_url,
      status: "publish",
    });
  }
}

console.log(`\n${updates.length} refresh(es), ${inserts.length} new listing(s).`);

async function run(table, list, opts) {
  for (let i = 0; i < list.length; i += 500) {
    const batch = list.slice(i, i + 500);
    const { error } = await db.from(table).upsert(batch, opts);
    if (error) { console.error(`${table} ${i}: ${error.message}`); process.exit(1); }
    console.log(`  ${table}: ${Math.min(i + 500, list.length)}/${list.length}`);
  }
}

if (inserts.length) { console.log("Inserting new listings..."); await run("businesses", inserts, { onConflict: "id" }); }
if (updates.length) { console.log("Refreshing existing listings..."); await run("businesses", updates, { onConflict: "id" }); }

console.log("\nDone. Re-run `node scripts/curate.mjs` to recompute scores, then rebuild.");
console.log("Note: new Google image hosts must be allowed in next.config.ts (added in this change).");
