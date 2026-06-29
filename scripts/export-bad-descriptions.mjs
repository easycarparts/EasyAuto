// Identify AI-generated descriptions with quality issues and export them for re-generation.
// Bad patterns:
//   1. Contains a Google Plus Code (e.g. "CGM6+WF2") used as a location
//   2. Starts with category type instead of business name ("car wash in ...", "auto parts store in ...")
//   3. Wrong service attribution ("washing and cleaning" on non-car-wash categories)
//   4. Fewer than 50 chars AND was AI-generated (description_ai not null)
//
//   node scripts/export-bad-descriptions.mjs [--limit 100]
//   -> writes scripts/_batch.json ready for re-generation

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { listingFacts } from "./lib/listing-quality.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const i = process.argv.indexOf("--limit");
const LIMIT = i >= 0 && process.argv[i + 1] ? Number(process.argv[i + 1]) : 100;

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const all = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await db
    .from("businesses")
    .select(
      "id, name, description, description_ai, category_slug, city, address, rating, google_reviews, website, hours, review_keywords",
    )
    .not("description_ai", "is", null)  // only listings we wrote AI descriptions for
    .order("id", { ascending: true })
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  all.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

// Plus Code pattern: e.g. "CGM6+WF2", "5QG8+RVF", "MP5J+M73"
const PLUS_CODE = /\b[A-Z0-9]{4,6}\+[A-Z0-9]{2,5}\b/;

// Category-type starts (agent used category label instead of business name)
const CAT_START = /^(car wash|auto parts store|auto repair shop|transportation service|association organization|used auto parts|vehicle repair|self-service car wash|car accessories store|car detailing|car rental|car dealer|oil change service)\s+in\b/i;

// Wrong service: "washing and cleaning" on categories that aren't car-wash
const WASH_NOISE = /washing and cleaning/i;
const CAR_WASH_CATS = /car.wash|auto.wash|vehicle.clean|detailing/i;

// Too short to be useful
const TOO_SHORT = 50; // chars

const reasons = new Map(); // id -> reason string

for (const b of all) {
  const desc = (b.description ?? "").trim();
  if (PLUS_CODE.test(desc)) {
    reasons.set(b.id, "plus-code");
  } else if (CAT_START.test(desc)) {
    reasons.set(b.id, "cat-start");
  } else if (WASH_NOISE.test(desc) && !CAR_WASH_CATS.test(b.category_slug ?? "")) {
    reasons.set(b.id, "wrong-service");
  } else if (desc.length < TOO_SHORT) {
    reasons.set(b.id, "too-short");
  }
}

const bad = all.filter((b) => reasons.has(b.id));
const batch = bad.slice(0, LIMIT).map((b) => {
  const f = listingFacts(b);
  return {
    id: b.id,
    name: f.name,
    category: (f.category ?? "auto services").replace(/-/g, " "),
    city: f.city,
    area: f.address,
    rating: f.rating,
    reviewCount: f.reviews,
    services: f.services,
    hasPublishedHours: f.hasHours,
    _badReason: reasons.get(b.id),   // for diagnostics only; not used by import
    _oldDesc: (b.description ?? "").slice(0, 80),
  };
});

writeFileSync(resolve(__dirname, "_batch.json"), JSON.stringify(batch, null, 2));

// Summary by reason
const counts = {};
for (const r of reasons.values()) counts[r] = (counts[r] ?? 0) + 1;

console.log(`\n=== BAD DESCRIPTION AUDIT ===`);
console.log(`Total AI-generated listings: ${all.length}`);
console.log(`Bad descriptions found: ${bad.length}`);
for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
console.log(`\nExported ${batch.length} to scripts/_batch.json (${bad.length - batch.length} more remaining after this batch).`);
