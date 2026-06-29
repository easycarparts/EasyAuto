import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const env = {};
for (const line of readFileSync(resolve(ROOT, '.env.local'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim();
}
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

// Check word count distribution - fetch all in pages
const all = [];
for (let from = 0; ; from += 1000) {
  const { data, error } = await sb.from('businesses')
    .select('id, name, description')
    .not('description', 'is', null)
    .order('id', { ascending: true })
    .range(from, from + 999);
  if (error || !data?.length) break;
  all.push(...data);
  if (data.length < 1000) break;
}

let short = 0, ok = 0, long = 0;
all.forEach(r => {
  const words = r.description?.trim().split(/\s+/).length ?? 0;
  if (words < 30) short++;
  else if (words > 85) long++;
  else ok++;
});

console.log(`\n=== DESCRIPTION QUALITY AUDIT ===`);
console.log(`Total with description: ${all.length}`);
console.log(`✅ OK (30-85w): ${ok}`);
console.log(`⚠️  Short (<30w): ${short}`);
console.log(`⚠️  Long (>85w): ${long}`);

// Sample 10 random ones across the range
console.log(`\n=== RANDOM SAMPLES ===`);
const samples = [0, 200, 400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2100].map(i => all[i]).filter(Boolean);
samples.forEach(r => {
  const words = r.description?.trim().split(/\s+/).length ?? 0;
  const flag = words < 30 ? '⚠️ SHORT' : words > 85 ? '⚠️ LONG' : '✅';
  console.log(`\n${flag} [${words}w] id=${r.id} ${r.name}`);
  console.log(`   ${r.description}`);
});

// Show 5 shortest to see worst case
console.log(`\n=== 5 SHORTEST DESCRIPTIONS ===`);
const sorted = [...all].sort((a, b) => {
  const wa = a.description?.trim().split(/\s+/).length ?? 0;
  const wb = b.description?.trim().split(/\s+/).length ?? 0;
  return wa - wb;
});
sorted.slice(0, 5).forEach(r => {
  const words = r.description?.trim().split(/\s+/).length ?? 0;
  console.log(`[${words}w] id=${r.id} ${r.name}: ${r.description}`);
});
