// One-off curation pass (run after import). Idempotent.
//
//  1. Dedupe businesses by Google place_id — keep the canonical row (un-suffixed
//     slug, tiebreak by reviews); record old->canonical slug 301s.
//  2. Compute the Easy Auto Score (0-100) for every kept business:
//       completeness (40) + dampened reputation (40) + trust (20).
//  3. Recompute categories.listing_count from the deduped set.
//  4. Sync Supabase: add score columns, DELETE dup rows, UPDATE scores + counts.
//  5. Write back data/businesses.json, data/categories.json, data/dedup-redirects.json.
//
// Usage:  node scripts/curate.mjs

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
const load = (f) => JSON.parse(readFileSync(resolve(ROOT, "data", f), "utf8"));
const save = (f, v) => writeFileSync(resolve(ROOT, "data", f), JSON.stringify(v, null, 2));

// ---------------------------------------------------------------------------
// 1. Dedupe by place_id
// ---------------------------------------------------------------------------
const businesses = load("businesses.json");
const groups = new Map();
for (const b of businesses) {
  if (!b.place_id) continue;
  if (!groups.has(b.place_id)) groups.set(b.place_id, []);
  groups.get(b.place_id).push(b);
}

const isSuffixed = (slug) => /-\d+$/.test(slug);
const redirectMap = {}; // old slug -> canonical slug
const removeIds = new Set();
const kept = [];

for (const b of businesses) {
  if (!b.place_id) {
    kept.push(b);
    continue;
  }
}
for (const [, group] of groups) {
  if (group.length === 1) {
    kept.push(group[0]);
    continue;
  }
  // canonical: prefer an un-suffixed slug; among candidates, most reviews, then lowest id
  const ranked = [...group].sort((a, b) => {
    const sa = isSuffixed(a.slug) ? 1 : 0;
    const sb = isSuffixed(b.slug) ? 1 : 0;
    if (sa !== sb) return sa - sb;
    if ((b.google_reviews ?? 0) !== (a.google_reviews ?? 0))
      return (b.google_reviews ?? 0) - (a.google_reviews ?? 0);
    return a.id - b.id;
  });
  const canonical = ranked[0];
  kept.push(canonical);
  for (const dup of ranked.slice(1)) {
    redirectMap[dup.slug] = canonical.slug;
    removeIds.add(dup.id);
  }
}

console.log(`Dedupe: ${businesses.length} -> ${kept.length} (removed ${removeIds.size}, ${Object.keys(redirectMap).length} redirects)`);

// ---------------------------------------------------------------------------
// 2. Easy Auto Score
// ---------------------------------------------------------------------------
const clamp01 = (x) => Math.max(0, Math.min(1, x));
const ratings = kept.map((b) => b.rating).filter((r) => r != null);
const meanRating = ratings.reduce((s, r) => s + r, 0) / Math.max(1, ratings.length);

// 95th-percentile review count per category (for the implausibility penalty).
const byCat = new Map();
for (const b of kept) {
  const c = b.category_slug ?? "_";
  if (!byCat.has(c)) byCat.set(c, []);
  byCat.get(c).push(b.google_reviews ?? 0);
}
const p95 = new Map();
for (const [c, arr] of byCat) {
  const sorted = [...arr].sort((a, b) => a - b);
  p95.set(c, sorted[Math.floor(sorted.length * 0.95)] ?? 0);
}

function completeness(b) {
  let s = 0;
  const d = (b.description ?? "").length;
  s += d > 300 ? 12 : d > 120 ? 8 : d > 0 ? 4 : 0;
  if (b.thumbnail_url) s += 8;
  if (b.hours) s += 6;
  if (b.website && b.website !== "#") s += 6;
  if (b.phone) s += 4;
  if (b.email) s += 2;
  if (b.latitude != null && b.longitude != null) s += 2;
  return s; // max 40
}

function reputation(b) {
  const n = b.google_reviews ?? 0;
  const r = b.rating;
  if (!r) return { score: 0, bayesian: null, penalised: false };
  const C = 15;
  const bayesian = (C * meanRating + r * n) / (C + n);
  const ratingScore = clamp01((bayesian - 3) / 2); // 3.0–5.0 -> 0–1
  const CAP = 200;
  const volume = Math.min(1, Math.log10(1 + n) / Math.log10(1 + CAP));
  let score = (0.6 * ratingScore + 0.4 * volume) * 40;
  // Implausibility penalty: outlier review count for the category + thin profile.
  const website = b.website && b.website !== "#";
  const thin = !website && (b.description ?? "").length < 120;
  const catP95 = p95.get(b.category_slug ?? "_") ?? 0;
  const penalised = n > Math.max(catP95, 30) && thin;
  if (penalised) score *= 0.5;
  return { score, bayesian, penalised };
}

for (const b of kept) {
  const comp = completeness(b);
  const rep = reputation(b);
  const trust = (b.claimed ? 10 : 0) + (b.featured ? 10 : 0);
  const total = Math.round(Math.max(0, Math.min(100, comp + rep.score + trust)));
  b.easy_auto_score = total;
  b.score_breakdown = {
    completeness: comp,
    reputation: Math.round(rep.score),
    trust,
    bayesian_rating: rep.bayesian != null ? Number(rep.bayesian.toFixed(2)) : null,
    penalised: rep.penalised,
  };
}

const scores = kept.map((b) => b.easy_auto_score).sort((a, b) => a - b);
console.log(
  `Scores: min ${scores[0]}, median ${scores[Math.floor(scores.length / 2)]}, max ${scores[scores.length - 1]}, penalised ${kept.filter((b) => b.score_breakdown.penalised).length}`,
);

// ---------------------------------------------------------------------------
// 3. Recompute category counts
// ---------------------------------------------------------------------------
const categories = load("categories.json");
const catCounts = new Map();
for (const b of kept) {
  if (!b.category_slug) continue;
  catCounts.set(b.category_slug, (catCounts.get(b.category_slug) ?? 0) + 1);
}
for (const c of categories) c.listing_count = catCounts.get(c.slug) ?? 0;

// ---------------------------------------------------------------------------
// 4. Sync Supabase
// ---------------------------------------------------------------------------
const password = env.SUPABASE_DB_PASSWORD;
const client = new pg.Client({
  host: "aws-1-ap-northeast-1.pooler.supabase.com",
  port: 5432,
  user: `postgres.${ref}`,
  password,
  database: "postgres",
  ssl: { rejectUnauthorized: false },
});
await client.connect();
await client.query(
  "alter table businesses add column if not exists easy_auto_score smallint, add column if not exists score_breakdown jsonb",
);
await client.query(
  "create index if not exists businesses_score_idx on businesses (easy_auto_score desc nulls last)",
);
// Force PostgREST to refresh its schema cache so the new columns are visible to
// the data API immediately (otherwise `select('*')` omits them until it reloads).
await client.query("notify pgrst, 'reload schema'");
await client.end();
console.log("Schema: score columns ensured + PostgREST cache reload signalled.");

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// Delete duplicate rows
const removeList = [...removeIds];
for (let i = 0; i < removeList.length; i += 200) {
  const batch = removeList.slice(i, i + 200);
  const { error } = await db.from("businesses").delete().in("id", batch);
  if (error) {
    console.error("delete error:", error.message);
    process.exit(1);
  }
}
console.log(`Deleted ${removeList.length} duplicate rows.`);

// Upsert kept rows (carries the new scores) + categories
async function upsert(table, rows, conflict) {
  for (let i = 0; i < rows.length; i += 500) {
    const batch = rows.slice(i, i + 500);
    const { error } = await db.from(table).upsert(batch, { onConflict: conflict });
    if (error) {
      console.error(`upsert ${table} error:`, error.message);
      process.exit(1);
    }
  }
}
await upsert("businesses", kept, "id");
await upsert("categories", categories, "slug");
console.log("Upserted scored businesses + category counts.");

// ---------------------------------------------------------------------------
// 5. Write data files
// ---------------------------------------------------------------------------
save("businesses.json", kept);
save("categories.json", categories);
save("dedup-redirects.json", {
  _comment: "Old duplicate business slugs -> canonical slug. 301-redirected (next.config.ts).",
  count: Object.keys(redirectMap).length,
  redirects: redirectMap,
});
console.log("Wrote data/businesses.json, data/categories.json, data/dedup-redirects.json. Done.");
