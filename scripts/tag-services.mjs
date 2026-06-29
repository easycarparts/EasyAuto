// Tag every business with the services it actually offers (detected from name +
// description + review keywords), so PPF/ceramic/detailing/etc. shops surface under
// the right service pages even though the import only gave them one category.
//
//   node scripts/tag-services.mjs            # dry run: per-service counts
//   node scripts/tag-services.mjs --apply    # write service_tags + recompute counts

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const APPLY = process.argv.includes("--apply");

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// service category slug -> matcher. Slugs must exist in `categories`.
const DETECTORS = [
  ["paint-protection-film", /\bppf\b|paint[\s-]?protection/],
  ["ceramic-coating-service", /ceramic/],
  ["car-detailing-service", /detail/],
  ["vehicle-wrapping-service", /\bwrap|vinyl wrap|car wrap/],
  ["auto-window-tinting-service", /\btint/],
];

const blob = (b) =>
  `${b.name ?? ""} ${b.description ?? ""} ${b.review_keywords ?? ""}`.toLowerCase();

async function loadAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("businesses")
      .select("id, name, description, review_keywords, category_slug, status")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const all = await loadAll();

// Compute tags per business: primary category + every detected service.
const tagsById = new Map();
const counts = {};
for (const b of all) {
  const tags = new Set();
  if (b.category_slug) tags.add(b.category_slug);
  const text = blob(b);
  for (const [slug, re] of DETECTORS) if (re.test(text)) tags.add(slug);
  tagsById.set(b.id, [...tags]);
  for (const t of tags) counts[t] = (counts[t] ?? 0) + 1;
}

console.log("Service-tag coverage (detected services in bold):");
for (const [slug] of DETECTORS) {
  console.log(`  ${String(counts[slug] ?? 0).padStart(4)}  ${slug}`);
}
console.log(`  (total businesses: ${all.length})`);

if (!APPLY) {
  console.log("\nDry run — no changes. Re-run with --apply to write service_tags + counts.");
  process.exit(0);
}

// Write service_tags with per-row UPDATEs (upsert would hit NOT NULL columns on
// its insert path). Concurrency pool keeps it quick.
let done = 0;
const ids = all.map((b) => b.id);
async function worker() {
  while (ids.length) {
    const id = ids.pop();
    const { error } = await db
      .from("businesses")
      .update({ service_tags: tagsById.get(id) })
      .eq("id", id);
    if (error) throw new Error(`service_tags update ${id}: ${error.message}`);
    done++;
    if (done % 200 === 0 || done === all.length) {
      process.stdout.write(`\r  tagged: ${done}/${all.length}   `);
    }
  }
}
await Promise.all(Array.from({ length: 12 }, worker));
process.stdout.write("\n");

// Recompute categories.listing_count from the tag sets (published shops only).
const published = all.filter((b) => b.status === "publish");
const catCounts = {};
for (const b of published) {
  for (const t of tagsById.get(b.id)) catCounts[t] = (catCounts[t] ?? 0) + 1;
}
const { data: cats } = await db.from("categories").select("slug");
for (const c of cats ?? []) {
  await db.from("categories").update({ listing_count: catCounts[c.slug] ?? 0 }).eq("slug", c.slug);
}
console.log("Recomputed category listing_count from service_tags. Done.");
