// Apply a single .sql migration to the hosted Supabase project via the session
// pooler (the direct db.<ref>.supabase.co host is IPv4-unavailable). Mirrors
// scripts/db-setup.mjs but takes an arbitrary file argument.
//
// Usage:  node scripts/migrate.mjs supabase/migrations/0002_auth_owners.sql

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const file = process.argv[2];
if (!file) {
  console.error("Usage: node scripts/migrate.mjs <path-to.sql>");
  process.exit(1);
}

const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD missing from .env.local");

const HOSTS = [
  "aws-1-ap-northeast-1.pooler.supabase.com",
  "aws-0-ap-northeast-1.pooler.supabase.com",
];

const sql = readFileSync(resolve(ROOT, file), "utf8");

async function tryHost(host) {
  const client = new pg.Client({
    host,
    port: 5432, // session mode — required for DDL/migrations
    user: `postgres.${ref}`,
    password,
    database: "postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 15000,
    statement_timeout: 120000,
  });
  await client.connect();
  return client;
}

let client = null;
for (const host of HOSTS) {
  try {
    process.stdout.write(`Connecting via ${host} … `);
    client = await tryHost(host);
    console.log("OK");
    break;
  } catch (e) {
    console.log(`failed (${e.code || e.message})`);
  }
}
if (!client) {
  console.error("Could not connect via any pooler host.");
  process.exit(1);
}

try {
  console.log(`Applying ${file} …`);
  await client.query(sql);
  console.log("Migration applied successfully.");
} catch (e) {
  console.error("Migration failed:", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
