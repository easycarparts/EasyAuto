// Export the next batch of thin listings (facts only) for a Claude Code session to
// write descriptions for — no paid API. Pairs with import-descriptions.mjs.
//
//   node scripts/export-thin.mjs [--limit 100]
//   -> writes scripts/_batch.json = [{ id, name, category, city, area, rating,
//      reviewCount, services, hasPublishedHours }]  (only enrich-tier, not yet done)

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { classify, listingFacts } from "./lib/listing-quality.mjs";

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
    .order("id", { ascending: true })
    .range(from, from + 999);
  if (error) throw new Error(error.message);
  all.push(...(data ?? []));
  if (!data || data.length < 1000) break;
}

const remaining = all.filter((b) => classify(b).tier === "enrich" && !b.description_ai);
const batch = remaining.slice(0, LIMIT).map((b) => {
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
  };
});

writeFileSync(resolve(__dirname, "_batch.json"), JSON.stringify(batch, null, 2));
console.log(`Wrote ${batch.length} listings to scripts/_batch.json (${remaining.length} still need descriptions).`);
