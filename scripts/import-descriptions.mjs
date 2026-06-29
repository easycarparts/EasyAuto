// Write session-authored descriptions back to Supabase (description_ai).
// Pairs with export-thin.mjs. No paid API — the session wrote the text.
//
//   node scripts/import-descriptions.mjs scripts/_results.json
//   where _results.json = [{ "id": 123, "description": "..." }, ...]

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

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/import-descriptions.mjs <results.json>");
  process.exit(1);
}
const rows = JSON.parse(readFileSync(resolve(ROOT, file), "utf8"));

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

let ok = 0;
let skipped = 0;
for (const r of rows) {
  const text = (r.description ?? "").trim();
  if (!r.id || text.length < 30) {
    skipped++;
    continue;
  }
  const { error } = await db.from("businesses").update({ description_ai: text }).eq("id", r.id);
  if (error) {
    console.error(`  ! id ${r.id}: ${error.message}`);
    skipped++;
  } else {
    ok++;
  }
}
console.log(`Saved ${ok} descriptions to description_ai${skipped ? `, skipped ${skipped}` : ""}.`);
