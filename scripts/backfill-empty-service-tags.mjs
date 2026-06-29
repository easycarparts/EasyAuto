#!/usr/bin/env node

// Backfill businesses that have empty service_tags, usually newer imports with
// category_slug=null. The script is conservative: dry-run by default, writes a
// review report, and only applies matches above the chosen confidence score.
//
//   node scripts/backfill-empty-service-tags.mjs
//   node scripts/backfill-empty-service-tags.mjs --apply
//   node scripts/backfill-empty-service-tags.mjs --min-score 1 --apply

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const REPORT_PATH = resolve(ROOT, "scripts", "_service-tag-backfill.json");

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const INCLUDE_PENDING = args.has("--include-pending");
const DRY_RUN_ALL = args.has("--all");
const minScoreArg = process.argv.indexOf("--min-score");
const MIN_SCORE =
  minScoreArg >= 0 ? Number(process.argv[minScoreArg + 1] ?? 1) : 1;

if (!Number.isFinite(MIN_SCORE) || MIN_SCORE < 1) {
  throw new Error("--min-score must be a positive number");
}

const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const RULES = [
  {
    slug: "towing-service",
    label: "recovery / towing",
    priority: 10,
    patterns: [
      /\b(car\s*)?recovery\b/,
      /\btow(?:ing)?\b/,
      /\btow\s*truck\b/,
      /\broadside\b/,
      /\bvehicle\s+recovery\b/,
      /\bpullout\b/,
    ],
  },
  {
    slug: "car-rental-leasing",
    label: "car rental / leasing",
    priority: 20,
    patterns: [
      /\brent[\s-]?a[\s-]?car\b/,
      /\bcar\s+rental\b/,
      /\brental\s+(?:car|fleet|vehicle)\b/,
      /\bvehicle\s+hire\b/,
      /\bleasing\b/,
      /\bfleet\s+management\b/,
    ],
  },
  {
    slug: "used-car-dealer",
    label: "used car dealer",
    priority: 30,
    patterns: [
      /\bused\s+(?:car|cars|vehicle|vehicles)\b/,
      /\bpre[\s-]?owned\b/,
      /\bcertified\s+pre[\s-]?owned\b/,
      /\bbuy(?:ing)?\s+and\s+sell(?:ing)?\b/,
      /\bsecond[\s-]?hand\b/,
      /\bused\s+vehicle\s+trading\b/,
      /\bsellanycar\b/,
      /\bbuyanycar\b/,
      /\bsell\s+(?:my|any|your)\s+car\b/,
      /\bwe\s+buy\s+cars?\b/,
      /\bcar\s+buyers?\b/,
      /\bcars?\s+trading\b/,
      /\bcars?\s+hub\b/,
      /\bltjr[@h]?\s+lsyrt\b/,
      /\blmstaaml\b/,
    ],
  },
  {
    slug: "auto-auction",
    label: "auto auction",
    priority: 35,
    patterns: [/\bauction\b/, /\bcars?\s+auction\b/],
  },
  {
    slug: "car-dealer",
    label: "car dealer / showroom",
    priority: 40,
    patterns: [
      /\bshowroom\b/,
      /\bdealer(?:ship)?\b/,
      /\bnew\s+cars?\b/,
      /\bvehicle\s+showroom\b/,
      /\bcars?\s+for\s+sale\b/,
      /\bofficial\s+dealer\b/,
      /\bauthorized\s+dealer\b/,
      /\bauthorised\s+dealer\b/,
      /\bautomobiles?\b/,
      /\bmotors?\b/,
      /\bmaard\b/,
      /\btest\s+drive\b/,
      /\bcars?\s+est\b/,
      /\bauto[\s-]?cars?\b/,
      /\bcarro\b/,
      /\bvehicle\s+sourcing\b/,
      /\btrading\s+enterprises\b/,
      /\brolls[\s-]?royce\s+boutique\b/,
    ],
  },
  {
    slug: "auto-repair-shop",
    label: "auto repair / service centre",
    priority: 50,
    patterns: [
      /\bservice\s+cent(?:er|re)\b/,
      /\bservicing\b/,
      /\brepair\b/,
      /\bgarage\b/,
      /\bworkshop\b/,
      /\bmaintenance\b/,
      /\bdiagnostic\b/,
      /\bmechanic\b/,
      /\bservice\b.*\b(?:repair|maintenance|workshop|garage)\b/,
      /\bdiesel\b/,
    ],
  },
  {
    slug: "car-repair-and-maintenance-service",
    label: "repair and maintenance",
    priority: 51,
    patterns: [
      /\bservice\s+cent(?:er|re)\b/,
      /\bservicing\b/,
      /\bmaintenance\b/,
      /\broutine\s+service\b/,
      /\boil\s+change\b/,
    ],
  },
  {
    slug: "auto-parts-store",
    label: "auto parts",
    priority: 60,
    patterns: [
      /\bauto\s+parts?\b/,
      /\bspare\s+parts?\b/,
      /\bcar\s+parts?\b/,
      /\bparts\s+store\b/,
      /\bgenuine\s+parts?\b/,
      /\baftermarket\b/,
    ],
  },
  {
    slug: "used-auto-parts-store",
    label: "used auto parts",
    priority: 61,
    patterns: [
      /\bused\s+(?:auto|car)?\s*parts?\b/,
      /\bscrap\b/,
      /\bsalvage\b/,
      /\bjunkyard\b/,
    ],
  },
  {
    slug: "vehicle-exporter",
    label: "vehicle export / shipping",
    priority: 70,
    patterns: [/\bexport\b/, /\bshipping\b/, /\bimported\s+cars?\b/, /\bunder\s+order\b/],
  },
  {
    slug: "motorcycle-atv-dealer",
    label: "motorcycle dealer",
    priority: 75,
    patterns: [/\bmotor\s*cycle\b/, /\bmotorcycles?\b/, /\bmotosport\b/, /\bbikes?\b/],
  },
  {
    slug: "truck-equipment-dealer",
    label: "truck / heavy equipment dealer",
    priority: 76,
    patterns: [/\bheavy\s+equipment\b/, /\btrucks?\b/, /\bbuses\b/, /\bpick[\s-]?ups\b/],
  },
  {
    slug: "transportation-service",
    label: "transportation",
    priority: 80,
    patterns: [
      /\bpassenger\s+transport/,
      /\bbus\s+rental\b/,
      /\btransport(?:ation)?\b/,
      /\bairport\s+pickup\b/,
      /\bchauffeur\b/,
    ],
  },
  {
    slug: "tire-wheel-shop",
    label: "tyres / wheels",
    priority: 90,
    patterns: [/\btyres?\b/, /\btires?\b/, /\bwheels?\b/, /\byokohama\b/],
  },
  {
    slug: "car-wash",
    label: "car wash",
    priority: 100,
    patterns: [
      /\bcar\s+wash\b/,
      /\bcar\s+washing\b/,
      /\bwash\s+station\b/,
      /\bsteam\s+wash\b/,
      /\bbody\s+wash\b/,
    ],
  },
  {
    slug: "car-accessories-store",
    label: "car accessories",
    priority: 110,
    patterns: [
      /\bauto\s+accessor(?:y|ies)\b/,
      /\bcar\s+accessor(?:y|ies)\b/,
      /\baccessories\s+fix\b/,
      /\bcar\s+alarm\b/,
    ],
  },
  {
    slug: "car-battery-store",
    label: "car battery",
    priority: 120,
    patterns: [/\bbattery\b/, /\bbatteries\b/, /\bjump\s*start\b/],
  },
  {
    slug: "auto-air-conditioning-service",
    label: "auto AC",
    priority: 130,
    patterns: [/\bauto\s+ac\b/, /\bcar\s+ac\b/, /\bair\s+conditioning\b/, /\bac\s+repair\b/],
  },
  {
    slug: "auto-tune-up-service",
    label: "performance / tuning",
    priority: 135,
    patterns: [
      /\bperformance\s+(?:garage|specialist|tuning|workshop|shop|parts)\b/,
      /\btuning\b/,
      /\bmotorsport\b/,
      /\bmotosport\b/,
    ],
  },
  {
    slug: "auto-electrical-service",
    label: "auto electrical",
    priority: 140,
    patterns: [/\belectrical\b/, /\belectrician\b/, /\bwiring\b/, /\bdiagnostic\b/],
  },
  {
    slug: "vehicle-inspection-service",
    label: "vehicle inspection",
    priority: 145,
    patterns: [/\bvehicle\s+inspection\b/, /\binspection\s+cent(?:er|re)\b/, /\bpassing\b/],
  },
  {
    slug: "auto-body-shop",
    label: "body shop",
    priority: 150,
    patterns: [/\bbody\s+shop\b/, /\bbodywork\b/, /\bdent\b/, /\bcollision\b/],
  },
  {
    slug: "auto-painting",
    label: "auto painting",
    priority: 160,
    patterns: [/\bpaint(?:ing)?\b/, /\bspray\b/, /\bcolour\s+change\b/, /\bcolor\s+change\b/],
  },
  {
    slug: "car-detailing-service",
    label: "detailing",
    priority: 170,
    patterns: [/\bdetail(?:ing)?\b/, /\bpolish(?:ing)?\b/, /\bpaint\s+correction\b/],
  },
  {
    slug: "parking-storage",
    label: "parking / storage",
    priority: 175,
    patterns: [
      /\bcar\s+parking\b/,
      /\bvehicle\s+parking\b/,
      /\bimpound\s+yard\b/,
      /\bvehicle\s+storage\b/,
      /\bautomobile\s+storage\b/,
    ],
  },
  {
    slug: "ceramic-coating-service",
    label: "ceramic coating",
    priority: 180,
    patterns: [/\bceramic\b/, /\bcoating\b/, /\b9h\b/],
  },
  {
    slug: "paint-protection-film",
    label: "paint protection film",
    priority: 190,
    patterns: [/\bppf\b/, /\bpaint[\s-]?protection\b/, /\bprotection\s+film\b/],
  },
  {
    slug: "auto-window-tinting-service",
    label: "window tinting",
    priority: 200,
    patterns: [/\btint(?:ing)?\b/, /\bwindow\s+film\b/, /\bsolar\s+film\b/],
  },
  {
    slug: "vehicle-wrapping-service",
    label: "vehicle wrapping",
    priority: 210,
    patterns: [/\bwrap(?:ping)?\b/, /\bvinyl\b/, /\bcar\s+wrap\b/],
  },
  {
    slug: "chauffeur-service",
    label: "chauffeur / car lift",
    priority: 220,
    patterns: [/\bcar\s+lift\b/, /\blimo(?:usine|sen)?\b/, /\bchauffeur\b/],
  },
];

const LOW_VALUE_PATTERNS = [
  /\bhotel\b/,
  /\bmall\b/,
  /\brestaurant\b/,
  /\bcafe\b/,
  /\bbakery\b/,
  /\bbarber\b/,
  /\bbuilding\s+materials\b/,
  /\bmobile(?:s)?\b/,
  /\bcinema\b/,
  /\blifeguard\b/,
  /\bfront\s+desk\b/,
];

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function textForBusiness(business) {
  return normalizeText(
    [
      business.name,
      business.slug,
      business.description,
      business.description_ai,
      business.website,
      business.address,
      business.review_keywords,
    ].join(" "),
  );
}

function matchBusiness(business, validCategories) {
  const text = textForBusiness(business);
  const matches = [];

  for (const rule of RULES) {
    if (!validCategories.has(rule.slug)) continue;
    let hits = 0;
    const evidence = [];
    for (const pattern of rule.patterns) {
      const m = text.match(pattern);
      if (m) {
        hits++;
        evidence.push(m[0]);
      }
    }
    if (hits > 0) {
      matches.push({
        slug: rule.slug,
        label: rule.label,
        score: hits,
        priority: rule.priority,
        evidence: [...new Set(evidence)].slice(0, 5),
      });
    }
  }

  const lowValue = LOW_VALUE_PATTERNS.some((pattern) => pattern.test(text));
  const confident = matches
    .filter((m) => m.score >= MIN_SCORE)
    .sort((a, b) => a.priority - b.priority);

  const tags = new Set();
  if (business.category_slug && validCategories.has(business.category_slug)) {
    tags.add(business.category_slug);
  }
  for (const m of confident) tags.add(m.slug);

  // A brand service centre often matches both dealer/showroom copy and service
  // copy. Keep both tags so it can surface in dealer and repair discovery.
  const tagList = [...tags];
  const bestPrimary =
    business.category_slug && validCategories.has(business.category_slug)
      ? business.category_slug
      : tagList[0] ?? null;

  return {
    id: business.id,
    slug: business.slug,
    name: business.name,
    city: business.city,
    currentCategory: business.category_slug,
    proposedCategory: bestPrimary,
    tags: tagList,
    lowValue,
    matched: tagList.length > 0,
    matches,
    appliedMatches: confident,
  };
}

async function selectAll(table, columns, orderBy = "id") {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db
      .from(table)
      .select(columns)
      .order(orderBy, { ascending: true })
      .range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return out;
}

async function loadCandidates() {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    let q = db
      .from("businesses")
      .select(
        "id, slug, name, description, description_ai, category_slug, service_tags, status, city, address, website, review_keywords",
      )
      .or("service_tags.is.null,service_tags.eq.{}")
      .order("id", { ascending: true })
      .range(from, from + 999);

    if (!INCLUDE_PENDING) q = q.eq("status", "publish");

    const { data, error } = await q;
    if (error) throw new Error(`businesses: ${error.message}`);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) break;
  }
  return rows;
}

async function recomputeCategoryCounts() {
  const all = await selectAll("businesses", "id, status, service_tags", "id");
  const counts = {};
  for (const b of all.filter((row) => row.status === "publish")) {
    for (const tag of b.service_tags ?? []) counts[tag] = (counts[tag] ?? 0) + 1;
  }

  const categories = await selectAll("categories", "slug", "slug");
  for (const c of categories) {
    const { error } = await db
      .from("categories")
      .update({ listing_count: counts[c.slug] ?? 0 })
      .eq("slug", c.slug);
    if (error) throw new Error(`category count ${c.slug}: ${error.message}`);
  }
}

const categories = await selectAll("categories", "slug, name", "slug");
const validCategories = new Set(categories.map((c) => c.slug));
const candidates = await loadCandidates();
const results = candidates.map((b) => matchBusiness(b, validCategories));
const matched = results.filter((r) => r.matched);
const unmatched = results.filter((r) => !r.matched);
const lowValueUnmatched = unmatched.filter((r) => r.lowValue);

const byTag = {};
for (const r of matched) {
  for (const tag of r.tags) byTag[tag] = (byTag[tag] ?? 0) + 1;
}

const report = {
  generatedAt: new Date().toISOString(),
  apply: APPLY,
  minScore: MIN_SCORE,
  includePending: INCLUDE_PENDING,
  candidates: candidates.length,
  matched: matched.length,
  unmatched: unmatched.length,
  lowValueUnmatched: lowValueUnmatched.length,
  byTag: Object.fromEntries(Object.entries(byTag).sort((a, b) => b[1] - a[1])),
  matchedRows: matched,
  unmatchedRows: unmatched,
};

writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`);

console.log(`Candidates: ${candidates.length}`);
console.log(`Matched:    ${matched.length}`);
console.log(`Unmatched:  ${unmatched.length} (${lowValueUnmatched.length} likely low-value/non-auto)`);
console.log(`Report:     ${REPORT_PATH}`);
console.log("\nTop proposed tags:");
for (const [tag, count] of Object.entries(report.byTag).slice(0, 15)) {
  console.log(`  ${String(count).padStart(4)}  ${tag}`);
}

if (DRY_RUN_ALL) {
  console.log("\nSample unmatched:");
  for (const r of unmatched.slice(0, 20)) {
    console.log(`  ${r.id}  ${r.slug}  ${r.name}`);
  }
}

if (!APPLY) {
  console.log("\nDry run only. Re-run with --apply to write service_tags/category_slug.");
  process.exit(0);
}

let updated = 0;
for (const r of matched) {
  const patch = { service_tags: r.tags };
  if (!r.currentCategory && r.proposedCategory) patch.category_slug = r.proposedCategory;

  const { error } = await db.from("businesses").update(patch).eq("id", r.id);
  if (error) throw new Error(`business ${r.id}: ${error.message}`);
  updated++;
  if (updated % 50 === 0 || updated === matched.length) {
    process.stdout.write(`\rUpdated ${updated}/${matched.length}   `);
  }
}
process.stdout.write("\n");

await recomputeCategoryCounts();
console.log("Recomputed category listing_count. Done.");
