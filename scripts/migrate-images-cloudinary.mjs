// Migrate listing images off the (soon-to-die) WordPress server into Cloudinary,
// while easyauto.ae/wp-content is still live. Cloudinary FETCHES each image by URL
// itself — no local download. We then repoint businesses.thumbnail_url at the
// permanent Cloudinary URL, preserving the original in original_thumbnail_url.
//
// Why: after domain cutover, easyauto.ae/wp-content/... 404s and every listing image
// breaks. This copies all ~3,612 of them (every type, incl. the ones whose Google
// source URL is already dead) to storage we control. Run it BEFORE cutover.
//
// Usage:
//   node scripts/migrate-images-cloudinary.mjs            # DRY: report only, no uploads
//   node scripts/migrate-images-cloudinary.mjs --push     # do it (needs Cloudinary key+secret)
//   node scripts/migrate-images-cloudinary.mjs --push --limit 20   # try a small batch first
//
// Idempotent: re-running skips listings already on Cloudinary; Cloudinary upload uses a
// stable public_id (easyauto/<slug>) with overwrite=false, so retries are safe.
//
// Prereqs in .env.local:
//   NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME   (diw6rekpm)
//   CLOUDINARY_API_KEY  CLOUDINARY_API_SECRET   (Cloudinary dashboard → Settings → API Keys)
//   NEXT_PUBLIC_SUPABASE_URL  SUPABASE_SERVICE_ROLE_KEY

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const args = process.argv.slice(2);
const PUSH = args.includes("--push");
const limitArg = args.indexOf("--limit");
const LIMIT = limitArg !== -1 ? parseInt(args[limitArg + 1], 10) : Infinity;
const CONCURRENCY = 6;

// .env.local loader
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split("\n")) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
}

const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const CLOUD = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME || "diw6rekpm";
const CK = process.env.CLOUDINARY_API_KEY;
const CS = process.env.CLOUDINARY_API_SECRET;

if (!SUPA_URL || !SUPA_KEY) { console.error("Missing Supabase env in .env.local."); process.exit(1); }

const { createClient } = await import("@supabase/supabase-js");
const db = createClient(SUPA_URL, SUPA_KEY, { auth: { persistSession: false } });

// Pull every listing whose image still lives on the WordPress server.
console.log("Loading listings with a wp-content image...");
const targets = [];
{
  const page = 1000;
  for (let from = 0; ; from += page) {
    const { data, error } = await db
      .from("businesses")
      .select("id, slug, thumbnail_url, original_thumbnail_url")
      .ilike("thumbnail_url", "%easyauto.ae/wp-content/%")
      .range(from, from + page - 1);
    if (error) { console.error(error.message); process.exit(1); }
    if (!data?.length) break;
    targets.push(...data);
    if (data.length < page) break;
  }
}
const todo = targets.slice(0, LIMIT);
console.log(`  ${targets.length} listings on wp-content; processing ${todo.length}.`);

if (!PUSH) {
  const sample = todo.slice(0, 5).map((b) => ({ slug: b.slug, from: b.thumbnail_url, to: `res.cloudinary.com/${CLOUD}/.../easyauto/${b.slug}` }));
  writeFileSync(resolve(ROOT, "data", "image-migration-plan.json"),
    JSON.stringify({ total: targets.length, willProcess: todo.length, sample }, null, 2));
  console.log("\nDRY RUN — wrote data/image-migration-plan.json");
  console.log("Add CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET to .env.local, then re-run with --push.");
  console.log("Tip: start with `--push --limit 20` to verify before the full run.");
  process.exit(0);
}

if (!CK || !CS) { console.error("Missing CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET in .env.local."); process.exit(1); }

// Signed upload to Cloudinary, fetching the remote wp-content URL server-side.
async function uploadByUrl(remoteUrl, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);
  // Cloudinary signs sorted signable params (not file/api_key/cloud_name).
  const toSign = `overwrite=false&public_id=${publicId}&timestamp=${timestamp}`;
  const signature = createHash("sha1").update(toSign + CS).digest("hex");
  const body = new URLSearchParams({
    file: remoteUrl,
    public_id: publicId,
    overwrite: "false",
    timestamp: String(timestamp),
    api_key: CK,
    signature,
  });
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/image/upload`, { method: "POST", body });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.secure_url) {
    throw new Error(json?.error?.message || `HTTP ${res.status}`);
  }
  return json.secure_url;
}

let done = 0, failed = 0;
const failures = [];
async function worker(b) {
  const publicId = `easyauto/${b.slug}`;
  try {
    const url = await uploadByUrl(b.thumbnail_url, publicId);
    const patch = { thumbnail_url: url };
    if (!b.original_thumbnail_url) patch.original_thumbnail_url = b.thumbnail_url;
    const { error } = await db.from("businesses").update(patch).eq("id", b.id);
    if (error) throw new Error(`db: ${error.message}`);
    done++;
    if (done % 100 === 0) console.log(`  ${done}/${todo.length} migrated...`);
  } catch (e) {
    failed++;
    failures.push({ id: b.id, slug: b.slug, from: b.thumbnail_url, error: String(e.message || e) });
  }
}

console.log("Uploading to Cloudinary (fetch-by-URL) + repointing thumbnail_url...");
for (let i = 0; i < todo.length; i += CONCURRENCY) {
  await Promise.all(todo.slice(i, i + CONCURRENCY).map(worker));
}

console.log(`\nDone. migrated=${done}  failed=${failed}`);
if (failures.length) {
  writeFileSync(resolve(ROOT, "data", "image-migration-failures.json"), JSON.stringify(failures, null, 2));
  console.log(`Wrote ${failures.length} failures to data/image-migration-failures.json (re-run to retry — succeeded ones are skipped).`);
}
console.log("Re-run safe: already-migrated rows no longer match the wp-content filter.");
