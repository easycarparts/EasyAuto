# Easy Auto — Ordered Roadmap

> Do the steps **in this order**. Each step says what it depends on. Read `HANDOVER.md` first for
> full context (stack, data, accounts). This file is the "what to do next, and in what order."

---

## 📋 Copy-paste this prompt to start the next session

```
Read HANDOVER.md and ROADMAP.md in this repo — they're the full context for the Easy Auto
directory rebuild (Next.js + Supabase). The project is scaffolded and 4,535 listings are already
extracted into data/*.json.

Work through ROADMAP.md IN ORDER. Start at the first unchecked step.

Important direction:
- I do NOT like the old WordPress design — build a fresh, modern design. Match the old site's
  URLs/structure for SEO, but NOT its look.
- The current categories don't make sense — they need restructuring into a sensible taxonomy
  (with 301 redirects from the old category URLs so we don't lose Google rankings).
- Don't break SEO: preserve /business/<slug>/ and news URLs 1:1, redirect any changed category URLs.

Confirm the plan and tell me which step you're on, then begin. Ask me for anything you need
(e.g. my own-services WhatsApp/booking link for lead routing, or design preferences).
```

---

## Key decisions locked in
- **New design, same URLs.** Don't replicate the old WordPress look — design fresh. But keep
  `/business/<slug>/`, `/news/<slug>/` identical, and 301-redirect any category URLs that change.
- **Categories get restructured.** The 96 raw Google categories are messy. Group them into a small,
  sensible set of top-level services (with the granular ones as sub-categories/filters). This MUST
  come with an old-slug → new-slug 301 map (SEO).
- **Lead-first.** Every listing captures leads; high-intent categories route to the owner's own
  services. (Owner provides the WhatsApp/booking target.)
- **Auth + submit-business comes after the public site works.**

---

## The order

### 🟧 Step 1 — SEO baseline (do before changing anything)
*No dependency.*
- [x] Pull the full old URL list from `https://easyauto.ae/sitemap_index.xml` (incl. the 5 business sub-sitemaps).
- [x] Save it in the repo — done: **`data/old-urls.json`** (4,753 live URLs). It's the master list every page must still answer.
- [ ] **(NEEDS OWNER)** Snapshot current top pages/queries from Google Search Console for a "before" comparison.
      Export Performance → top pages + top queries (last 3 months) to `data/gsc-baseline-*.csv` so we can compare rankings ~2 weeks post-launch.

**Step 1 findings (captured in `data/old-urls.json` → `analysis`):**
- Business URLs match `data/businesses.json` **1:1** (4,535 / 4,535, zero diff) → no business redirects needed. ✅
- **102 "orphan" category URLs** are live/indexed on the old site but have **no businesses** in our extract
  (e.g. `car-rental-agency`, `tesla-showroom`, `boat-detailing-service`, plus non-auto junk like `mosque`, `deli`, `band`).
  These will 404 unless 301-redirected → must be mapped in **Step 3**.
- The 96 categories we *do* have data for, plus these 102, = the 198 `business-category` URLs in the old sitemap.
- Legacy duplicate/junk URLs to 301 (Step 3/8): `/2025/07/15/...auto-parts...` → `/news/...`; `hello-world` & `/category/uncategorized/` → `/`.
- 13 WP utility pages (`/submit-business`, `/dashboard`, `/claim-business`…) map to Step 7 auth pages or 301 to home.

### ✅ Step 2 — Design system + page shells (NEW look) — DONE
*Built against `data/*.json` (Step 4 swaps the data layer to Supabase, no page changes).*
- [x] Visual design: clean / light / trustworthy. Tailwind v4 `@theme` tokens (brand blue, slate ink,
      soft canvas) in `src/app/globals.css`; Inter font; self-contained "EasyAuto" wordmark.
- [x] Shared components in `src/components/`: header, footer, search bar (client), business card,
      category card, rating stars, breadcrumbs, pagination, JSON-LD, container.
- [x] Data layer `src/lib/data.ts` — async functions reading the JSON now; **the swap-to-Supabase seam**
      (signatures stay identical in Step 4). Module-level memoised so the 11 MB file is read once per build.
- [x] Route shells (server components):
  - `/` homepage (hero + search, category grid, top-rated, emirates, news teaser)
  - `/business-category/[slug]` (paginated; `generateStaticParams` over 96 cats)
  - `/business/[slug]` (hero, rating, About, Google map embed, contact sidebar; **4,535 SSG pages**)
  - `/news` + `/news/[slug]` (renders WP-block HTML), `/search` (noindex), `not-found`
- [x] `generateMetadata` (title/description/canonical/OG) on every page + JSON-LD: `LocalBusiness` +
      `AggregateRating` + `GeoCoordinates` + `BreadcrumbList` on listings, `Article` on news, `WebSite` on home.
- [x] `npm run build` green — **4,639 static pages** generated. All routes verified (real → 200, missing → 404).

**Step 2 notes / carry-forward:**
- Contact sidebar on listings is presentational (Call / Directions). Real **lead capture is Step 6**.
- `/business-category/[slug]` renders dynamically (it reads `?page=`); still full server HTML (SEO-safe).
  Could move page-1 to static later if we want it prerendered.
- Google Maps embed uses the keyless `?output=embed` URL (fine for now).
- `next.config.ts`: image `remotePatterns` for easyauto.ae/Cloudinary/Supabase; `turbopack.root` pinned.
- Images still hot-link `easyauto.ae/wp-content` — migrate before cutover (HANDOVER §7).

### ✅ Step 3 — Restructure categories — DONE
*Strategy chosen by owner: **HYBRID** (lowest SEO risk).*
- [x] **9 service groups** defined in `src/lib/taxonomy.ts` (Wash & Cleaning, Detailing & Protection,
      Tinting & Wrapping, Repair & Maintenance, Body & Paint, Parts & Accessories, Tyres & Wheels,
      Towing & Recovery, Dealers & Rental). All 96 raw auto categories mapped into them; non-auto
      categories stay ungrouped (their URLs still work, just not promoted in nav).
- [x] **Hybrid URLs:** the existing 96 `/business-category/<raw-slug>` URLs are unchanged (no redirect
      risk on ranking pages). New **hub pages** at `/business-category/<group-slug>` aggregate each
      group's member categories + top listings. `/business-category/[slug]` now serves both.
- [x] **301/308 redirect map** in `next.config.ts` (`async redirects()` ← `src/lib/redirects.ts`):
      all **102 orphan** category URLs redirect — real auto ones → closest group hub
      (e.g. `car-rental-agency`→`dealers-and-rental`, `wheel-alignment-service`→`tyres-and-wheels`),
      non-auto junk (`mosque`, `deli`, `band`…) → home. Plus 3 legacy permalink redirects from Step 1.
      Orphan list verified to match `data/old-urls.json` 1:1 (102/102).
- [x] Groups surfaced as primary nav on homepage ("Browse by service"), header and footer.
- [x] `npm run build` green — **4,648 pages**. Redirects verified (308 → correct target); hubs & raw
      category pages all 200.

> **301 vs 308 note:** Next's `redirects({ permanent: true })` emits **HTTP 308** (permanent),
> which Google treats as equivalent to a 301 for ranking. If you specifically need literal 301s,
> we'd move these to a `proxy.ts` — say the word.

### ✅ Step 4 — Wire up live data — DONE
*Supabase setup done via CLI route (see below); pages now read the live DB.*
- [x] **Schema created** on the hosted project. Installed the Supabase CLI (devDep) + `pg`; the direct
      `db.<ref>.supabase.co` host is IPv4-unavailable, so connected via the **session pooler**
      (`aws-1-ap-northeast-1.pooler.supabase.com:5432`). `scripts/db-setup.mjs` ran `supabase/schema.sql`
      (also staged as `supabase/migrations/…_init_schema.sql` for future `supabase db push`).
- [x] **Data imported** — `npm run import` loaded 96 categories, 4,535 businesses, 2 news. Fixed a bug in
      the import script first (duplicate news slug + junk `hello-world` would have hit the `unique(slug)` constraint).
- [x] **Pages point at Supabase** — `src/lib/data.ts` rewritten to use **targeted queries** (a listing page
      fetches one row; category/group pages fetch one page + an exact count; the city/slug scans select a
      single column). The earlier "load all 4,535 rows in memory" approach overwhelmed PostgREST when 10
      build workers each pulled the full heavy text columns at once. Added retry/backoff (`run()`), RLS-safe
      anon reads. **No page/component changes** — the data-layer seam held.
- [x] **Verified**: `npm run build` green (4,648 pages from live DB, 50s). car-wash count = 889 (matches DB),
      group counts render (Parts 1,293 / Wash 916 / Towing 613…), business pages show rating+reviews+JSON-LD,
      search (`ilike`) returns results, news body renders, orphan redirects still 308.

> Credentials live in `.env.local` (gitignored): `SUPABASE_DB_PASSWORD`, `SUPABASE_DB_URL`. `leads` table is
> RLS-protected (anon can INSERT, only `service_role` can read).

### ✅ Step 5 — Programmatic location pages + filtering + geolocation — DONE
*Built on live Supabase data.*
- [x] **Location taxonomy** (`src/lib/locations.ts`): 7 emirates (city-normalised — `Ras Al-Khaimah`
      dupes merged, `Al Ain`→Abu Dhabi emirate) + **21 curated communities** keyword-matched on `address`
      (Al Quoz, Musaffah, Al Jerf, Motor City, Business Bay, Al Qusais, Dibba…). Fragments like
      "Al Quoz Industrial Area 3" fold into "Al Quoz".
- [x] **Programmatic pages** `/<service>-in-<location>` (`src/app/[combo]/page.tsx`):
      service = a group, a raw category, or `auto-services` (all); location = emirate or community.
      e.g. `/car-wash-in-dubai`, `/auto-services-in-abu-dhabi`, `/parts-and-accessories-in-musaffah`.
      Shared inventory logic in `src/lib/location-combos.ts` (≥3 listings); ~346 combos. Service + Area
      filter rows for cross-navigation; `generateMetadata`, `BreadcrumbList` JSON-LD; invalid combos → 404.
- [x] **Homepage filtering**: "Find services near me" button + emirate chips in the hero; "Browse by
      emirate" cards now link to the emirate hubs (live counts).
- [x] **Geolocation "near me"** (`/near-me` + `GeolocateButton`): browser geolocation → bounding-box
      Supabase query → Haversine sort → cards with distance pills (99.5% of listings have lat/lng). noindex.
- [x] **`sitemap.ts` + `robots.ts`**: sitemap lists ~4,987 URLs (listings, categories, groups, location
      pages, news); robots allows all, disallows `/search` + `/near-me`, points to the sitemap.
- [x] `npm run build` green (**4,994 pages**), ESLint clean. All routes verified.

> **⚠️ Data-quality follow-up (whole-site):** the WordPress export contains **duplicate listings** — the
> same Google Place imported multiple times with `-2`/`-3`… slug suffixes but an identical `place_id`
> (e.g. `sajid-khan-recovery-service` ×5). They inflate counts and repeat in listings. Dedup needs care:
> keep the canonical (un-suffixed) slug, 301 the suffixed ones (they're indexed URLs), exclude dupes from
> queries. Tracked as a separate task.

### ✅ Step 5.5 — Data curation, Easy Auto Score & ranking — DONE
*Requested by owner before continuing. Run `node scripts/curate.mjs` to recompute (idempotent).*
- [x] **Dedupe by `place_id`** — the WP import had the same Google Place imported multiple times.
      4,535 → **4,016 unique** (519 redundant rows removed). Canonical = un-suffixed slug (tiebreak: most
      reviews). The 519 old slugs **301-redirect** to canonical (`data/dedup-redirects.json` → `next.config.ts`).
      Category counts recomputed.
- [x] **Easy Auto Score (0–100)** stored per business (`easy_auto_score` + `score_breakdown` columns):
      **completeness 40** (description/photo/hours/website/phone/email/geo) + **dampened reputation 40**
      (Bayesian rating + log-capped volume) + **trust 20** (claimed + featured). Shown publicly as a badge
      on cards and a breakdown panel on listings. Scores: min 6 / median 52 / max 85.
- [x] **Fake-review dampening** — Bayesian pulls low-volume ratings to the mean; an **implausibility penalty**
      halves reputation when review count is a category outlier AND the profile is thin. 24 listings flagged
      (e.g. "Sajid Khan Recovery" 887 reviews/no website dropped off page 1).
- [x] **Ranking** now defaults to `easy_auto_score` everywhere (was raw rating/reviews).
- [x] **Featured section** (homepage): editor/paid `featured` flags lead; the rest **rotates daily**
      through the high-score pool (seed = day, daily ISR). Replaces the old "highest reviews" list.
- [x] Fixed a display bug: 2 listings had PHP-serialized `hours` (now parsed to a day-by-day list).
- [x] `npm run build` green (**4,457 pages**), ESLint clean.

> Schema note: `scripts/curate.mjs` adds the score columns and signals a PostgREST schema-cache reload
> (`notify pgrst`) — without it, `select('*')` omits the new columns until PostgREST auto-refreshes.

### 🟧 Step 6 — Lead engine (started)
*Depends on Step 4. Owner's funnel target still needed for high-intent routing.*
- [x] **`LeadButtons`** client component on every listing (`src/components/lead-buttons.tsx`):
      **WhatsApp** (green, primary) → `wa.me/<number>` with a prefilled message
      ("Hi <name>, I came from your Easy Auto listing…"), plus Call + Get-directions. UAE phone
      numbers normalised to international via `whatsappNumber()`. Replaces the old "Call now".
- [x] Each click **logs a lead** (`action`, `business_id`, `category_slug`, `city`, `routed_to`, `source`)
      via the anon client — RLS-verified that anon INSERT works and only `service_role` can read.
- [x] **Routing config** (`src/lib/lead-routing.ts`): high-intent categories (detailing, wash, PPF,
      tinting, wrapping) are wired to route to the owner's own funnel — **activates once
      `OWNER_FUNNEL.whatsapp` is set** (see [[owner-grand-touch]]). Until then, CTAs go to the listed business.
- [ ] Quote-form modal → `leads`.
- [ ] Admin view to read `leads` (server-side, service_role).
- [ ] **NEEDS OWNER:** the WhatsApp/booking number to route high-intent leads to.

### ☐ Future — multiple categories per business
*Flagged by owner (e.g. Grand Touch does detailing + wash + PPF + tint).* Currently each business has one
`category_slug`. Needs a schema change (a `business_categories` join table, or a `category_slugs` array)
and updates to ranking/filtering/score. Revisit after the core flow is settled.

### ✅ Step 7 — Supabase Auth + Submit / Claim a business — DONE
*Built this session (see STATUS.md → "What's done" row 7 for detail).*
- [x] Supabase Auth (magic link + Google OAuth) via `@supabase/ssr` + `src/proxy.ts`.
- [x] "Submit your business" → pending `businesses` row (admin approves).
- [x] "Claim this business" flow (admin-approved) + owner dashboard to edit listing + add
      Cloudinary photos/videos. Multi-category supported (`business_categories` join table).
- [x] Admin view (`/admin`) reads `leads` and approves submissions/claims (service_role, server-side).
- [x] Easy Auto Score tie-in: claim/edit/media recompute completeness + trust.
- **Owner to do:** enable Google provider + redirect URLs in Supabase; create the Cloudinary image preset.
- **Follow-up:** discovery (category/group/location browse) still ranks on the single primary
  `category_slug`; wire it to the join table so multi-category businesses surface everywhere.

### ☐ Step 8 — Google-safe launch
*Depends on everything above.*
- Confirm every old URL resolves 1:1 or 301-redirects (check against `data/old-urls.json` from Step 1).
- Generate + submit `app/sitemap.ts` / `robots.ts` to Search Console.
- Deploy to the NEW Vercel project, point easyauto.ae at it, watch rankings ~2 weeks vs. the Step 1 snapshot.

---

## Reminders
- `npm run dev` to work locally; `npm run build` must stay green.
- Images still point at `easyauto.ae/wp-content/...` — migrate to Cloudinary/Supabase Storage before final cutover (HANDOVER §7).
- Ask the owner for: own-services WhatsApp/booking link (Step 6), and any design references/brand colours (Step 2).
