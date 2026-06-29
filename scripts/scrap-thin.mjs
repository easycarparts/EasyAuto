// Noindex the dregs — archive `scrap`-tier listings (no description, no reputation,
// no website, no keywords). Nothing unique to say + almost certainly no search
// demand, so they only drag down crawl budget and domain quality.
//
// Setting status='archived' makes the public RLS policy hide them: the page 404s,
// generateStaticParams skips them, and they drop out of the sitemap. Reversible —
// flip status back to 'publish' to restore.
//
//   node scripts/scrap-thin.mjs            # dry run: counts + sample (no changes)
//   node scripts/scrap-thin.mjs --apply    # archive them
//   node scripts/scrap-thin.mjs --restore  # un-archive (set scrap-tier back to publish)

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import { classify } from "./lib/listing-quality.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const APPLY = process.argv.includes("--apply");
const RESTORE = process.argv.includes("--restore");

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function loadAll() {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from("businesses")
      .select("id, slug, name, description, category_slug, city, rating, google_reviews, website, review_keywords, status")
      .order("id", { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

const all = await loadAll();

if (RESTORE) {
  const targets = all.filter((b) => classify(b).tier === "scrap" && b.status === "archived");
  console.log(`Restoring ${targets.length} archived listings to publish…`);
  for (const b of targets) {
    await db.from("businesses").update({ status: "publish" }).eq("id", b.id);
  }
  console.log("Done.");
} else {
  const scrap = all.filter((b) => classify(b).tier === "scrap");
  console.log(`scrap-tier listings: ${scrap.length} of ${all.length}`);
  console.log("\nSample (first 10):");
  for (const b of scrap.slice(0, 10)) {
    console.log(`  - ${b.name} [${b.category_slug ?? "?"}, ${b.city ?? "?"}]`);
  }
  if (APPLY) {
    console.log(`\nArchiving ${scrap.length} listings…`);
    let n = 0;
    for (const b of scrap) {
      const { error } = await db.from("businesses").update({ status: "archived" }).eq("id", b.id);
      if (!error) n++;
    }
    console.log(`Archived ${n}. They now 404 / drop from sitemap. Reverse with --restore.`);
  } else {
    console.log("\nDry run — no changes made. Re-run with --apply to archive.");
  }
}
