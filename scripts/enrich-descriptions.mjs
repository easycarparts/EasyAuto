// Activate dormant listings — generate unique, FACT-GROUNDED descriptions for thin
// listings so they stop being "Crawled - currently not indexed".
//
// Uses Claude Haiku 4.5 (cheap, fast, fine for short factual text). Each description
// is built ONLY from the listing's own real data, so every page is unique and adds
// genuine info — not scaled filler.
//
// Flow (resumable, safe — staged before going live):
//   node scripts/enrich-descriptions.mjs --generate [--limit N] [--model sonnet]
//        → writes description_ai for `enrich`-tier listings missing one
//   node scripts/enrich-descriptions.mjs --sample [N]
//        → prints generated drafts to spot-check
//   node scripts/enrich-descriptions.mjs --promote [--limit N]
//        → copies description_ai → description (backs up original), source='ai'
//
// Requires ANTHROPIC_API_KEY + SUPABASE_SERVICE_ROLE_KEY in .env.local.

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { classify, listingFacts } from "./lib/listing-quality.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const valOf = (f, d) => {
  const i = args.indexOf(f);
  return i >= 0 && args[i + 1] ? args[i + 1] : d;
};
const LIMIT = Number(valOf("--limit", "0")) || 0;
const CONCURRENCY = Number(valOf("--concurrency", "6")) || 6;
const MODEL = valOf("--model", "haiku") === "sonnet" ? "claude-sonnet-4-6" : "claude-haiku-4-5";

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const SELECT =
  "id, slug, name, description, description_ai, category_slug, city, address, rating, google_reviews, website, hours, review_keywords";

async function loadAll() {
  const out = [];
  const pageSize = 1000;
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await db
      .from("businesses")
      .select(SELECT)
      .order("id", { ascending: true })
      .range(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    out.push(...(data ?? []));
    if (!data || data.length < pageSize) break;
  }
  return out;
}

function humanizeCategory(slug) {
  if (!slug) return "auto services";
  return slug.replace(/-/g, " ");
}

const SYSTEM = `You write concise, factual one-paragraph descriptions for listings on a UAE auto-services business directory.

Rules:
- Use ONLY the facts provided. Never invent services, history, awards, opening times, prices, or claims.
- No marketing superlatives ("best", "leading", "premier", "top-rated", "your one-stop").
- 45-85 words, one paragraph, natural UAE/British English.
- Say what the business does and where it is. If services are listed, weave a few in naturally.
- Vary sentence structure between businesses — do not reuse a template.
- If a rating is provided you may mention it factually (e.g. "rated 4.5/5 from 120 Google reviews").
- Output ONLY the description text. No preamble, no quotes, no headings.`;

async function generate(client, b) {
  const facts = listingFacts(b);
  const userFacts = {
    name: facts.name,
    category: humanizeCategory(facts.category),
    city: facts.city,
    area: facts.address,
    rating: facts.rating,
    reviewCount: facts.reviews,
    services: facts.services,
    hasPublishedHours: facts.hasHours,
  };
  const msg = await client.messages.create({
    model: MODEL,
    max_tokens: 300,
    system: SYSTEM,
    messages: [{ role: "user", content: `Facts:\n${JSON.stringify(userFacts, null, 2)}` }],
  });
  const text = msg.content
    .filter((blk) => blk.type === "text")
    .map((blk) => blk.text)
    .join("")
    .trim();
  return text;
}

// Simple concurrency pool.
async function runPool(items, worker, concurrency) {
  let i = 0;
  let done = 0;
  const total = items.length;
  async function next() {
    while (i < items.length) {
      const idx = i++;
      try {
        await worker(items[idx]);
      } catch (e) {
        console.error(`  ! ${items[idx].slug}: ${e.message}`);
      }
      done++;
      if (done % 25 === 0 || done === total) {
        process.stdout.write(`\r  progress: ${done}/${total}   `);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, next));
  process.stdout.write("\n");
}

// --- modes -----------------------------------------------------------------
async function doGenerate() {
  if (!env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY missing from .env.local — add it to run generation.");
    process.exit(1);
  }
  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
  const all = await loadAll();
  let targets = all.filter((b) => classify(b).tier === "enrich" && !b.description_ai);
  if (LIMIT) targets = targets.slice(0, LIMIT);
  console.log(`Model ${MODEL} · generating ${targets.length} descriptions (concurrency ${CONCURRENCY})…`);
  if (targets.length === 0) return;

  await runPool(
    targets,
    async (b) => {
      const text = await generate(client, b);
      if (!text || text.length < 30) throw new Error("empty/short output");
      const { error } = await db.from("businesses").update({ description_ai: text }).eq("id", b.id);
      if (error) throw new Error(error.message);
    },
    CONCURRENCY,
  );
  console.log("Done. Review with --sample, then apply with --promote.");
}

async function doSample() {
  const n = Number(valOf("--sample", "10")) || 10;
  const { data } = await db
    .from("businesses")
    .select("name, city, category_slug, description_ai")
    .not("description_ai", "is", null)
    .limit(n);
  for (const r of data ?? []) {
    console.log(`\n— ${r.name} (${r.category_slug ?? "?"}, ${r.city ?? "?"})`);
    console.log(`  ${r.description_ai}`);
  }
  console.log(`\n(${(data ?? []).length} samples)`);
}

async function doPromote() {
  const all = await loadAll();
  let targets = all.filter(
    (b) => b.description_ai && (b.description ?? "").trim().length < 120,
  );
  if (LIMIT) targets = targets.slice(0, LIMIT);
  console.log(`Promoting ${targets.length} AI descriptions into the live description field…`);
  let n = 0;
  for (const b of targets) {
    const { error } = await db
      .from("businesses")
      .update({
        original_description: b.description ?? null,
        description: b.description_ai,
        description_source: "ai",
        updated_at: new Date().toISOString(),
      })
      .eq("id", b.id);
    if (error) {
      console.error(`  ! ${b.slug}: ${error.message}`);
      continue;
    }
    n++;
    if (n % 100 === 0) process.stdout.write(`\r  promoted: ${n}/${targets.length}   `);
  }
  process.stdout.write("\n");
  console.log(`Promoted ${n}. Rebuild / let ISR refresh, then re-validate in GSC.`);
}

if (has("--promote")) await doPromote();
else if (has("--sample")) await doSample();
else await doGenerate();
