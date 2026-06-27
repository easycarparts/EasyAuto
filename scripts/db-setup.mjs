// One-off: create the schema on the hosted Supabase project via the connection
// pooler (the direct db.<ref>.supabase.co host is IPv4-unavailable). Connects with
// the DB password from .env.local, runs supabase/schema.sql, verifies the tables,
// and records the working pooler URL back into .env.local as SUPABASE_DB_URL.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

const env = {};
for (const line of readFileSync(resolve(ROOT, ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}

const ref = new URL(env.NEXT_PUBLIC_SUPABASE_URL).host.split(".")[0];
const password = env.SUPABASE_DB_PASSWORD;
if (!password) throw new Error("SUPABASE_DB_PASSWORD missing from .env.local");

// Region is ap-northeast-1 (Tokyo). Pooler instance prefix differs per project, so try both.
const HOSTS = [
  "aws-0-ap-northeast-1.pooler.supabase.com",
  "aws-1-ap-northeast-1.pooler.supabase.com",
];

const schema = readFileSync(resolve(ROOT, "supabase", "schema.sql"), "utf8");

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
let workingHost = null;
for (const host of HOSTS) {
  try {
    process.stdout.write(`Connecting via ${host} … `);
    client = await tryHost(host);
    workingHost = host;
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
  console.log("Running schema.sql …");
  await client.query(schema);

  const { rows } = await client.query(
    `select table_name from information_schema.tables
     where table_schema = 'public' order by table_name`,
  );
  console.log("Tables now present:", rows.map((r) => r.table_name).join(", "));

  // Record the working pooler URL for future use (npm run import can keep using
  // the service_role key; this is just for reference / future migrations).
  const encoded = encodeURIComponent(password);
  const dbUrl = `postgresql://postgres.${ref}:${encoded}@${workingHost}:5432/postgres`;
  let envText = readFileSync(resolve(ROOT, ".env.local"), "utf8");
  envText = envText.replace(/SUPABASE_DB_URL=.*(\r?\n|$)/g, "");
  if (!envText.endsWith("\n")) envText += "\n";
  envText += `SUPABASE_DB_URL=${dbUrl}\n`;
  writeFileSync(resolve(ROOT, ".env.local"), envText);
  console.log(`Recorded SUPABASE_DB_URL (host ${workingHost}).`);
} finally {
  await client.end();
}
console.log("Schema setup complete.");
