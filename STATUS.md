# Easy Auto — Current State & Next Session

> **This is the authoritative "where we are / what's next" doc.** Read this first, then
> `ROADMAP.md` (detailed per-step notes) and `HANDOVER.md` (original build plan / accounts).
> Created at the end of a long build session to hand off to a fresh chat.

---

## TL;DR — how to resume

The site is **built and running on live Supabase data**. Steps 1–5.5 of the roadmap are done plus the
start of the lead engine (WhatsApp button). Everything is **uncommitted** (working tree, on `main`).

```bash
npm run dev            # local dev (http://localhost:3000)
npm run build          # production build — MUST stay green (currently 4,457 pages)
npx eslint src         # lint — currently clean
```

**To preview a production build for screenshots:** `.claude/launch.json` defines `easyauto-prod`
(`npm run start`, autoPort). The screenshot tool can hang on the Google Maps iframe — prefer `curl`
for verification.

---

## ✅ What's done (Steps 1 → 5.5 + WhatsApp)

| Step | Status | One-liner |
|------|--------|-----------|
| 1 — SEO baseline | ✅ | `data/old-urls.json` = all 4,753 old URLs + analysis. GSC export still owed by owner. |
| 2 — Design + pages | ✅ | Fresh clean/light design; all route shells; metadata + JSON-LD. |
| 3 — Category taxonomy | ✅ | 9 service-group hubs over the 96 raw URLs (hybrid); 102 orphans 301'd. |
| 4 — Live data | ✅ | Schema run, data imported, `src/lib/data.ts` queries Supabase. |
| 5 — Location + geo | ✅ | `/<service>-in-<location>` pages; emirate/community filters; near-me geolocation; sitemap/robots. |
| 5.5 — Curation + score | ✅ | Deduped to 4,016; **Easy Auto Score** (40/40/20) + fake-review dampening; rotating featured. |
| 6 — Lead engine | 🟧 parked | WhatsApp lead button + lead logging done; rest **parked** (see "Next"). |
| 7 — Auth + Submit/Claim/Manage | ✅ | Supabase Auth (magic link + Google), owner dashboard, submit/claim/manage, Cloudinary media, multi-category, admin panel, score tie-in. Build green (4,462 pages). **Needs owner: Google provider + redirect URLs in Supabase; Cloudinary image preset.** |

### Key facts
- **Design:** clean/light/trustworthy. Tailwind v4 `@theme` tokens in `src/app/globals.css`; Inter font;
  brand blue. No external brand assets.
- **Data layer = the seam:** `src/lib/data.ts` — async, targeted Supabase queries with retry/backoff.
  Pages/components never query directly.
- **Taxonomy:** `src/lib/taxonomy.ts` (9 groups + `resolveService`), `src/lib/locations.ts`
  (7 emirates + 21 communities), `src/lib/location-combos.ts` (which `/<svc>-in-<loc>` combos have ≥3 listings).
- **Easy Auto Score:** stored per business (`easy_auto_score` + `score_breakdown` columns).
  Completeness 40 + dampened reputation 40 + trust 20. Shown as a badge (cards) and panel (listing).
  Computed by `scripts/curate.mjs`. Scores: min 6 / median 52 / max 85.
- **Ranking** everywhere is by `easy_auto_score` desc. Homepage **Featured** rotates daily (seed = day, ISR).
- **Lead capture:** `src/components/lead-buttons.tsx` — WhatsApp (green) / Call / Directions, each logs a
  row to `leads`. Routing config in `src/lib/lead-routing.ts` (dormant until `OWNER_FUNNEL.whatsapp` set).

---

## 🗂️ File map (the important bits)

```
src/
  app/
    layout.tsx, page.tsx (homepage, ISR daily), globals.css
    business/[slug]/page.tsx          # listing: score panel, hours, lead buttons, map, JSON-LD
    business-category/[slug]/page.tsx # raw category OR a 9-group hub page
    [combo]/page.tsx                  # programmatic /<service>-in-<location> (root catch-all, validated)
    near-me/page.tsx                  # geolocation results (noindex)
    news/, search/, not-found.tsx, sitemap.ts, robots.ts
  components/  site-header, site-footer, business-card, category-card, rating-stars,
               score-badge (ScoreBadge + ScorePanel), lead-buttons, geolocate-button,
               search-bar, breadcrumbs, pagination, json-ld, container, logo
  lib/  data.ts, types.ts, site.ts, format.ts, structured-data.ts,
        taxonomy.ts, locations.ts, location-combos.ts, redirects.ts, lead-routing.ts, supabase.ts
scripts/  extract-wordpress.mjs, import-to-supabase.mjs, db-setup.mjs (schema via pooler), curate.mjs
data/  businesses.json (4,016, scored), categories.json (recounted), news.json,
       old-urls.json (Step 1), dedup-redirects.json (519 business 301s)
supabase/  schema.sql, migrations/…_init_schema.sql
```

---

## 🔌 Supabase / infra

- Project `qsuawztcgpheaxewzbyt` (Tokyo). **Live data: 4,016 businesses, 96 categories, 2 news, scored.**
- Reads use the **anon key** (RLS allows public SELECT on catalog; `leads` is insert-only for anon,
  read only by `service_role`).
- **Connect for DDL/writes via the SESSION POOLER** — the direct `db.<ref>.supabase.co` host is
  IPv4-disabled. Working host: `aws-1-ap-northeast-1.pooler.supabase.com:5432`, user `postgres.<ref>`.
- Credentials in `.env.local` (gitignored): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
  `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`, Cloudinary vars.
- `supabase` CLI + `pg` installed as devDeps.

---

## ⚠️ Gotchas learned this session (don't relearn the hard way)

1. **PostgREST schema cache:** after `ALTER TABLE` (new columns), the data API's `select('*')` omits the
   new columns until PostgREST reloads. `curate.mjs` now issues `notify pgrst, 'reload schema'`. If reads
   come back missing a new column, that's why.
2. **Next build cache:** after a **data-only** change (no source edit), `next build` may reuse cached
   prerenders. If pages show stale data, `rm -rf .next` then rebuild.
3. **`scripts/curate.mjs` is NOT safe to blindly re-run** on already-deduped data — it would regenerate
   `dedup-redirects.json` as *empty* (no dups left to find) and wipe the 519 redirects. Re-run only against
   a fresh (un-deduped) `data/businesses.json`, or guard it before re-running.
4. **Root `[combo]` route** catches any unmatched single-segment path; it validates and 404s invalids.
   Explicit routes (`/business`, `/news`, …) take precedence, so it's safe.
5. **Redirects are 308** (`permanent: true`), which Google treats as a permanent 301-equivalent. Switch to
   `proxy.ts` if literal 301s are ever required.
6. **Next 16 specifics:** `params`/`searchParams` are async; Tailwind v4 `@theme` (no config file);
   `images.remotePatterns`; `PageProps<'/route'>` typegen helper; `middleware`→`proxy`.
7. **Auth & static pages:** never read the session in the root layout / a shared server component —
   it turns every static page dynamic. Auth UI in the header is a client component (`AuthNav`); the
   proxy matcher is scoped to auth routes only. Owner/admin reads use the service-role client behind
   `import "server-only"` modules (`owner-data.ts`, `admin-data.ts`), always filtered by the caller's uid.
8. **RLS hides pending rows:** the businesses public-read policy is `status='publish'`. The anon data
   layer (and build) therefore never sees pending submissions automatically — no per-query filter needed.
   Owner/admin views use the service-role client to see them.

---

## 🧭 NEXT SESSION — new priorities (owner's direction)

The owner re-prioritised away from the lead engine toward **SEO growth + owner self-service**. Build in
this order:

### 1. Auth + Submit / Claim / Manage business — ✅ DONE (this session)
- **Supabase Auth** via `@supabase/ssr`: magic link + Google OAuth. Cookie-session refresh in
  `src/proxy.ts` (Next 16 Proxy), scoped to `/dashboard`, `/admin`, `/login`, `/auth/*` so the
  4k static pages stay static. Clients: `src/lib/supabase/{server,browser,admin}.ts`; DAL in
  `src/lib/auth.ts`. Header `AuthNav` is a **client** component (else the root layout would turn
  every page dynamic).
- **Schema** (`supabase/migrations/0002_auth_owners.sql`, applied via `scripts/migrate.mjs`):
  `profiles` (auto-created by trigger; `hello@sgservices.ae` seeded as admin), `businesses.owner_id`,
  `claim_requests`, `business_media`, `business_categories` (multi-category, backfilled 3,561 rows).
  Public read RLS now gates on `status='publish'` so **pending submissions are auto-hidden**;
  `businesses.id` got an auto-sequence default for new submissions.
- **Flows:** `/login` → `/auth/callback`; `/dashboard` (listings + claim statuses), `/dashboard/submit`
  (pending row), `/dashboard/claim/[slug]`, `/dashboard/business/[id]` (edit + Cloudinary uploader).
  `/admin` (approve/reject submissions & claims, read leads). Public listing page got ISR (1h) +
  a media gallery + a "Claim this business" CTA.
- **Security model:** all owner/admin **writes go through server actions** that verify identity, then
  use the service-role client for constrained, whitelisted-field updates (owners can't self-publish /
  set featured / edit score).
- **Score tie-in:** `src/lib/score.ts` recomputes completeness + trust on edit/claim/media (claimed
  = +10 trust), preserving the curated reputation component.
- **⚠️ NEEDS OWNER to fully activate:** (1) in Supabase → Auth: enable the **Google provider**
  (client ID/secret) and add **redirect URLs** (`http://localhost:3000/auth/callback` + the prod URL);
  (2) in Cloudinary: create an **unsigned image preset** named `easyauto-listings` (or set
  `NEXT_PUBLIC_CLOUDINARY_IMAGE_PRESET`). Magic-link login + everything else works without these.

### 2. Per-business blog  *(SEO link-building engine)*
- Each business can publish **articles** with their own SEO pages (e.g. Grand Touch writes multiple
  posts linking to their site). Other companies do the same → more indexable content + internal/external
  links. "A lighter WordPress-style" content layer on top of the directory.
- Needs: a `posts`/`articles` table (business_id, slug, title, body, SEO meta), routes like
  `/business/<slug>/<article-slug>` or `/articles/<slug>`, sitemap inclusion, JSON-LD `Article`.
- Watch dofollow/nofollow policy on outbound links (decide deliberately).

### 3. SEO / traffic growth is THE goal
- Current ~1.2k/mo is spread thin and largely **brand/intent searches** (specific businesses, "recovery",
  "batteries"). The aim is to **grow total traffic substantially** before monetising.
- Levers already in place: location pages (Step 5), category hubs, score-based ranking. Next: the blog,
  richer claimed profiles, internal linking, and the GSC baseline (still owed) to measure.

### 4. Lead engine — REIMAGINED, do later
- Owner does **not** want blanket WhatsApp CTAs everywhere. Instead: **contextual banner ads / prompts**
  ("Need your car serviced?", "Looking for…") shown selectively. Needs proper design. The WhatsApp button
  built this session is a placeholder; revisit the whole approach when traffic is up.
- Owner-funnel routing config is ready (`src/lib/lead-routing.ts`); still needs the WhatsApp/booking number.

### Also outstanding
- **Multiple categories per business** (Grand Touch = detailing + wash + PPF + tint…) — schema change
  (join table or array column) + ranking/filter/score updates. Do alongside the manage-business work.
- **Images** still hot-link `easyauto.ae/wp-content/...` — migrate to Cloudinary/Supabase Storage before
  cutover (HANDOVER §7).
- **GSC baseline** export (Step 1) — owner to provide.
- **Deploy** (Step 8): new Vercel project, point domain, submit sitemap.

---

## Kickoff prompt for the next session

```
Read STATUS.md, then ROADMAP.md, in this repo — full context for the Easy Auto rebuild
(Next.js 16 + Supabase). The public site is built and running on live Supabase data
(Steps 1–5.5 done). Everything is uncommitted on main.

Next priorities (owner's direction, in order):
1. Supabase Auth + Submit/Claim/Manage business (owners edit their listing, add photos/videos;
   owner dashboard). Build with SEO + the Easy Auto Score in mind.
2. Per-business blog — individual SEO article pages per business (link-building / indexing engine).
3. SEO/traffic growth is the real goal — grow well beyond the current ~1.2k/mo before monetising.
4. Lead engine is PARKED — to be reimagined as contextual banner ads, not blanket WhatsApp CTAs.

Also flagged: multiple-categories-per-business (schema change). Confirm the plan and start with #1.
```
