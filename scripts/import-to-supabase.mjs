// Import the extracted JSON into Supabase.
//
// Prereqs:
//   1. Run supabase/schema.sql in the Supabase SQL editor first.
//   2. Run `npm run extract` to produce ./data/*.json.
//   3. Put your ROTATED service_role key in .env.local (SUPABASE_SERVICE_ROLE_KEY).
//
// Usage:  npm run import
//
// Uses the service_role key (admin, bypasses RLS) — server-side only, never in the browser.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

// minimal .env.local loader (no dependency)
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key || key.includes("PASTE_YOUR_NEW")) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. Rotate your secret key in Supabase and paste it there."
  );
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

const load = (f) => JSON.parse(readFileSync(resolve(ROOT, "data", f), "utf8"));

async function upsert(table, rows, chunk = 500) {
  for (let i = 0; i < rows.length; i += chunk) {
    const batch = rows.slice(i, i + chunk);
    const { error } = await db.from(table).upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`Error on ${table} [${i}-${i + batch.length}]:`, error.message);
      process.exit(1);
    }
    console.log(`  ${table}: ${Math.min(i + chunk, rows.length)}/${rows.length}`);
  }
}

console.log("Importing categories...");
const categories = load("categories.json");
const { error: catErr } = await db
  .from("categories")
  .upsert(categories, { onConflict: "slug" });
if (catErr) { console.error(catErr.message); process.exit(1); }
console.log(`  categories: ${categories.length}`);

console.log("Importing businesses...");
await upsert("businesses", load("businesses.json"));

console.log("Importing news...");
await upsert("news", load("news.json"));

console.log("Done.");
