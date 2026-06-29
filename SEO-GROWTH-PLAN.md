# Easy Auto — SEO Growth Plan & Context Handoff

> **Purpose:** full context + next steps for growing easyauto.ae organic traffic and turning it
> into leads for the owner's own business. Written to hand off to a fresh session/research pass.
> Read alongside `STATUS.md`, `ROADMAP.md`, `HANDOVER.md`.
>
> **Created:** 2026-06-29. Stack: Next.js 16 + Supabase (live). Data layer = `src/lib/data.ts`.

---

## 1. The goal

1. **Grow organic traffic from ~1.3k clicks/mo → 10k+/mo by end of 2026** (~7–8× in ~6 months — aggressive but plausible given huge latent impressions; contingent on a clean launch + execution).
2. **Endgame = leads for the owner's own business** (Grand Touch — **PPF / ceramic / detailing**). The directory's high-intent traffic funnels to the owner's services via **contextual banners** (the reimagined, parked "lead engine"). See `src/lib/lead-routing.ts` (`OWNER_FUNNEL.whatsapp` still `null`). Memory: [[owner-grand-touch]].

---

## 2. GSC baseline (the measurement anchor)

Exported to the repo folder **`GSC 29/06/2026 12 months/`** (Performance + Indexing CSVs). Re-pull every ~2 weeks post-launch and compare against these exact numbers.

**Performance (last 12 months):**
- **7,931 clicks · 1,557,972 impressions · 0.51% CTR · avg position ~12.** Recent run-rate ~1.3k clicks/mo, growing. 96% UAE, 72% of clicks mobile.

**Indexing (the urgent problem):**
- **Indexed ~2,860 and FALLING** (was 3,016 in March). **Not indexed 3,517 and RISING.**
- **2,024 "Crawled – currently not indexed"** → thin content; Google judged them not worth indexing.
- **1,024 "Discovered – not indexed"** → crawl budget / low perceived value.
- **Search Appearance report is EMPTY** → zero rich results (no review stars).

---

## 3. Key findings (what the data proves)

1. **Traffic = business-name searches landing on individual listing pages.** Every top page is `/business/…`. Homepage gets ~41 clicks. Category/location pages don't crack the top 20. → **More real listings + better-ranked hub/location pages = the growth levers.**
2. **~75% of listings are dormant** (zero impressions). Cause: **58% of listings are thin** (37% have *no* description, 54% no website). Maps to the 2,024 "Crawled – not indexed".
3. **Huge latent opportunity:** 1.56M impressions at 0.51% CTR — convert what you already have (CTR + ranking) before manufacturing new pages.
4. **High-intent commercial queries rank on page 2** and are barely converted: "recovery near me" 4,294 impr (pos 13), "car detailing abu dhabi" pos 71, "ppf near me" pos 39, "ppf coating near me" pos 62.
5. **Service gap = PPF/ceramic/detailing** (the owner's services). They had NO PPF/ceramic category — but **the shops already exist untagged**: 139 PPF, 204 ceramic, 296 detailing, 206 tinting, 127 wrapping.
6. **Recovery is the proven winner** (258 listings, ranks page 1–2 on many recovery queries) — amplify it.
7. **Submit-business is not a search-traffic channel** (27 search clicks/yr, no demand for "list my business"). It grows *supply*, which is valuable indirectly.

---

## 4. What was built this session ✅

- **Stronger titles** (CTR) across business / category / location pages — name + rating + review count; "Best … — Compare N Providers". Plain "Rated X/5" (no ★ glyph — Google strips it).
- **Structured-data compliance fix** — removed Google's third-party rating/reviews from `AggregateRating`/`Review` JSON-LD (`src/lib/structured-data.ts`). It was penalty risk for stars Google wasn't granting. Stars require **first-party reviews** later.
- **Listing-description enrichment engine** (de-thin dormant listings):
  - `scripts/lib/listing-quality.mjs` — classifier: **good 1,703 / enrich 2,121 / scrap 192**.
  - `scripts/enrich-descriptions.mjs` — AI descriptions (Haiku 4.5, fact-grounded, staged → promote). Needs `ANTHROPIC_API_KEY`.
  - `scripts/export-thin.mjs` + `scripts/import-descriptions.mjs` — **bridge so a Claude Code session can write descriptions (subscription, no API cost)**.
  - `scripts/scrap-thin.mjs` — archive the 192 dregs (reversible, `--apply`).
- **Service tagging + multi-service discovery** (Phases 1 + 2):
  - Added **PPF** + **Ceramic Coating** categories; tagged all 4,016 shops into the services they offer (`service_tags text[]`, GIN-indexed).
  - Discovery (hub, group hub, location combos) now reads `service_tags` — a shop appears under every service it does.
  - New live pages: `/business-category/paint-protection-film` (139), `/ceramic-coating-service` (204), plus service×location combos. **Build green: 4,516 pages.**

### P3 + P4 build (this session)
- **Research:** `data/seo-research.md` — cited keyword/SERP/brand research cross-referenced with GSC
  (recovery ~19.4k impr, wash ~12.4k, detailing ~4.2k are the proven first-party winners; PPF/ceramic
  thin today only because we had no target pages).
- **P3 — 7 "[service] near me" landing pages:** `/car-recovery-near-me`, `/car-detailing-near-me`,
  `/car-wash-near-me`, `/ppf-near-me`, `/ceramic-coating-near-me`, `/window-tinting-near-me`,
  `/car-wrapping-near-me`. Config in `src/lib/near-me.ts`; shared render `src/components/near-me-landing.tsx`.
  Suppliers grouped by emirate (from `service_tags`), unique fact-grounded copy + checklist, breadcrumb +
  FAQ + ItemList JSON-LD, canonical, internal links to hub + `/<cat>-in-<emirate>` combos, in sitemap.
  Explicit routes (take precedence over the `[combo]` catch-all).
- **Lead slot:** every near-me page carries the adaptive lead funnel at the top (see the
  "Adaptive lead-capture funnel" section below — `lead-banner.tsx` was the initial stub and has been
  superseded by `lead-capture.tsx`).
- **P4 — brand pages:** `/brands` + `/brands/<slug>` (10 brands, Tier 1+2: XPEL, Ceramic Pro, 3M, V-KOOL,
  Gtechniq, STEK, Gyeon, SunTek, LLumar, IGL). Content-led (`src/lib/brands.ts`): tiers, warranty, UAE
  presence + real service-category listings + links to the matching near-me/hub. Article + breadcrumb JSON-LD.
- **P4 — guide cluster:** `/guides` + `/guides/<slug>` (6 guides: ppf-vs-ceramic-coating, ppf-cost-in-dubai,
  ceramic-coating-price-uae, car-detailing-cost-dubai, window-tint-law-uae, car-wrapping-cost-dubai).
  Fact-grounded AED ranges + conservative RTA rules (`src/lib/guides.ts`); Article + FAQ JSON-LD; first-party
  authorship (`siteArticleJsonLd`). Footer now links Services / near-me / Guides / Brands for crawl depth.
- **Pre-existing lint:** `npx eslint src` reports 3 errors in untouched files (`src/app/business/page.tsx`
  `<a href="/">`, `src/components/map/map-view.tsx` setState-in-effect) — predate this session; flagged separately.

### Adaptive lead-capture funnel (this session)
- **The "canonical" funnel:** one `src/components/lead-capture.tsx` (client), written once and parameterised
  by each page's context — there are no per-page funnels. Animated banner (CSS `lead-sheen` sheen, respects
  `prefers-reduced-motion`) → modal with a 3-field form (name + phone required, email/message optional).
  Hidden fields auto-fill service/location/source/business_id from the page; honeypot (`company`) blocks bots.
- **Wired into:** the 7 near-me pages, the `/<service>-in-<location>` combo pages (service + location context),
  the brand pages (sidebar `variant="card"`), and **every individual `/business/<slug>` listing page** — placed
  high in the main column (right after the title, above the fold) since that's where ~99% of traffic lands.
  Adding it elsewhere = one line.
- **Listing service label** comes from `resolveLeadService()` (`src/lib/lead-services.ts`): it reads the
  listing's `service_tags` (preferring the money services), NOT the raw `category_slug` — so a detailer whose
  category is "auto-care-products-store" correctly shows "paint protection film", and unknown categories fall
  back to a clean generic ("car parts", "tyres", "car services") instead of an awkward raw category name.
- **Per-listing opt-out:** `0012_lead_ads.sql` added `businesses.lead_ads_enabled` (default true). The listing
  banner is suppressed when false. Claimed owners can toggle it off from the dashboard
  (`src/components/dashboard/lead-ads-toggle.tsx` → `setLeadAdsEnabled` action) — the hook for not showing it
  to paying customers later. (Note: the owner's own Grand Touch listing is a prime candidate to switch off.)
- **Server action** `src/app/actions/lead.ts` (`submitLead`): validates, honeypot-checks, inserts via the
  service-role client. High-intent owner services (PPF/ceramic/detailing/tint/wrap) are tagged
  `routed_to='own_service'` via `isHighIntentService()` in `src/lib/lead-routing.ts` (PPF + ceramic added).
- **Admin inbox** (`/admin`): captured enquiries with full contact details, status workflow
  (new→contacted→won/lost via `updateLeadStatus` action), status filter, click-to-Call/WhatsApp, "Owner lead"
  badge; the old click-event log kept separately as "Recent click activity". `getRecentLeads`/`getLeadCounts`
  in `src/lib/admin-data.ts`.
- **Schema:** `0011_lead_capture.sql` (applied) added `service_slug`, `location_slug`, `lead_type`,
  `status` (default `new`) to `leads` + indexes. RLS unchanged (anon insert, service-role read/update).
- **Verified end-to-end:** submitted a real form on `/ceramic-coating-near-me` → row persisted with
  `service_slug=ceramic-coating-service, lead_type=form, status=new, routed_to=own_service` (test row deleted).
  Listing banner verified live on real listings (Detailing Dynamics now reads "paint protection film", not its
  raw "auto care products store" category; positioned above the fold). **Build green (exit 0), 4,345 pages;**
  all new code lint-clean (only the 3 pre-existing errors remain).
- **To activate the owner WhatsApp hand-off:** set `OWNER_FUNNEL.whatsapp` in `src/lib/lead-routing.ts`
  (leads are already captured + owner-flagged regardless). Add Cloudflare Turnstile only if spam appears.
- **Open product decisions (not yet actioned):** (a) the lead banner currently shows on *claimed* listings too
  (owner opts out) — could default it off for claimed instead; (b) it shows on dealer/rental + pure parts
  listings with generic copy — could suppress there; (c) all of the above is **uncommitted** on `main`.

### Schema migrations applied this session
- `0009_listing_enrichment.sql` — `description_ai`, `original_description`, `description_source`.
- `0010_service_tags.sql` — `service_tags text[]` + GIN index; PPF + Ceramic categories.
- `0011_lead_capture.sql` — `leads`: `service_slug`, `location_slug`, `lead_type`, `status` + indexes.
- `0012_lead_ads.sql` — `businesses.lead_ads_enabled boolean default true` (per-listing banner opt-out).

### Scripts reference
```bash
node scripts/migrate.mjs <file.sql>                 # apply a migration via session pooler
node scripts/tag-services.mjs [--apply]             # tag shops into services (done)
node scripts/scrap-thin.mjs [--apply|--restore]     # noindex the 192 dregs
# Enrichment via API (costs $):
node scripts/enrich-descriptions.mjs --generate [--limit N] [--model sonnet]
node scripts/enrich-descriptions.mjs --sample 15
node scripts/enrich-descriptions.mjs --promote
# Enrichment via a Claude Code session (no API cost) — see §7 prompt:
node scripts/export-thin.mjs --limit 100
node scripts/import-descriptions.mjs scripts/_results.json
```

---

## 5. The phased plan

| Phase | What | Status |
|------|------|--------|
| **P1** | Service taxonomy + tag existing shops (PPF/ceramic/detailing/…) | ✅ done |
| **P2** | Wire discovery (hubs + location combos) to multi-service | ✅ done |
| **P3** | **"[Service] near me" SEO landing pages** — per money-query page (`/car-recovery-near-me`, `/ppf-near-me`…), suppliers grouped by emirate, intro copy, JSON-LD, **lead-form/banner slot reserved at top**, sitemap. Target the near-me queries from GSC. | ✅ done |
| **P4** | **Brand pages + SEO guide cluster** — XPEL/STEK/SunTek/3M landing pages (content-led; brand mentions sparse), guides ("PPF cost in Dubai", "ceramic vs PPF", "car detailing in Al Quoz") linking to listings. | ✅ done |
| **P5** | **Enrichment run + indexing follow-through** — de-thin the 2,121, promote, deploy, GSC "Validate Fix" on "Crawled – not indexed". Then measure. | ongoing |
| **Lead layer** | **Adaptive lead-capture funnel** — one `LeadCapture` component (animated banner → modal form) parameterised by each page's service/location context; stores leads in Supabase (owner-flagged for high-intent) with an admin inbox. | ✅ built |
| **Coverage expansion** | Curated, **compliant** new listings for gap categories (top ~10 real businesses, enriched). Sources: business' own sites/socials, OpenStreetMap/Overpass, official UAE registries, owner submissions — **NOT Google scraping**. After dormancy fix is proven. | later |

---

## 6. Immediate next actions (in order)

1. **Commit the session's work** — titles, structured-data fix, enrichment engine, service tagging/discovery,
   **P3 near-me pages, P4 brand pages + guides, and the full adaptive lead funnel (incl. listing-page banners,
   `resolveLeadService`, per-listing opt-out, admin inbox + migrations 0011/0012)**. All currently uncommitted on `main`.
2. **Resolve the open lead-banner decisions** (claimed default on/off; suppress on dealers/parts) — see §4.
3. **Run the enrichment** (de-thin 2,121 listings) — use the session prompt in §7 (no API cost) OR `enrich-descriptions.mjs` with an API key. Then `--promote`.
4. **Scrap the dregs:** `node scripts/scrap-thin.mjs --apply`.
5. **Deploy** and in GSC hit **Pages → "Crawled – currently not indexed" → Validate Fix**.
6. **Set `OWNER_FUNNEL.whatsapp`** when the owner provides a number, to switch on the WhatsApp hand-off (capture already works).
7. **Measure** in ~2–4 weeks vs the §2 baseline — watch the near-me/brand/guide pages and the `leads` inbox.

---

## 7. Enrichment prompt for a separate Claude Code session (no API cost)

Open a new session in the `EasyAuto` folder and paste:

```
You are enriching thin business listings for Easy Auto (Next.js + Supabase) so they stop being
"Crawled - currently not indexed" in Google. YOU write the descriptions (no API calls); scripts
do all DB I/O. ~2,121 listings need descriptions. Loop:

1. node scripts/export-thin.mjs --limit 100      (writes scripts/_batch.json + remaining count)
2. Read scripts/_batch.json. For each listing write a description:
   - 45–85 words, one paragraph, natural UAE/British English.
   - Use ONLY the given facts. Never invent services, history, awards, hours, prices.
   - No superlatives ("best", "leading", "premier", "top-rated", "one-stop").
   - Say what they do + where. Weave in 2–4 REAL services from "services" — IGNORE review-noise
     like "team","professional","price","stars","good service","communication","quality".
   - If rating+reviewCount present, may state once ("rated 4.8/5 from 787 Google reviews").
   - Vary structure between listings.
3. Write scripts/_results.json = [{ "id": <id>, "description": "<text>" }, ...]
4. node scripts/import-descriptions.mjs scripts/_results.json
5. Repeat until export-thin reports "0 still need descriptions".

It's resumable (only fetches un-enriched). When done:
   node scripts/enrich-descriptions.mjs --sample 15
   node scripts/enrich-descriptions.mjs --promote
   node scripts/scrap-thin.mjs --apply
Then report how many descriptions were written.
```

---

## 8. Decisions / inputs needed from owner

- **`ANTHROPIC_API_KEY`** in `.env.local` — only if enriching via the paid API instead of a session.
- **WhatsApp/booking link** for `OWNER_FUNNEL.whatsapp` (`src/lib/lead-routing.ts`) — needed for the lead/banner layer.
- **GSC access** to hit "Validate Fix" and re-export performance for measurement.
- **Launch URL config** — Supabase Auth Site URL + redirect URLs must switch from `localhost` to the production domain at cutover.

---

## 9. Compliance guardrails (do not break these)

- **Do NOT scrape Google Maps / Google search**, and **do NOT build/store a directory from the Places API** — both violate Google's terms (Places allows storing only the Place ID; caching ratings/reviews/names is prohibited; building a competing dataset is prohibited).
- **Do NOT put third-party (Google) ratings/reviews in your structured data** — review schema must be first-party. (Already fixed.)
- **AI content must be fact-grounded and unique per page** (from the listing's own data) — generic mass content = "scaled content abuse" risk. No daily auto-news; no bulk auto-publish.
- **"Scrap" = noindex/archive (reversible), not delete.**

---

## 10. Research questions for the proper deep-dive

- Keyword/volume research (proper tool: Ahrefs/SEMrush/GKP) for UAE auto queries — PPF, ceramic, detailing, recovery, "near me" + emirate/community modifiers — to prioritise which hub/near-me pages to build and which brands matter.
- Competitor SERP analysis: who ranks for "car detailing dubai", "ppf near me", "recovery sharjah" — directory vs brand vs GBP — to set realistic ranking expectations per query.
- PPF/ceramic brand landscape in UAE (XPEL, STEK, SunTek, Llumar, Gtechniq, Ceramic Pro…) for brand pages/guides.
- Internal-linking architecture: best hub→listing and guide→listing structure to lift the "Discovered – not indexed" 1,024.
- First-party review collection design (the only compliant path to star rich results).
- Backlink strategy: get claimed businesses to link to their Easy Auto profile (real authority).

---

## 11. Key file map (this workstream)

```
src/lib/data.ts              # data layer — service_tags discovery (getBusinessesByCategory/…ByLocation/getLocationFacets)
src/lib/location-combos.ts   # which /<service>-in-<location> combos have inventory (now multi-service)
src/lib/taxonomy.ts          # 9 service groups; PPF+ceramic added to Detailing & Protection
src/lib/structured-data.ts   # JSON-LD (Google rating/reviews removed from schema)
src/lib/listing-quality.mjs  # (scripts/lib) good/enrich/scrap classifier
src/lib/lead-routing.ts      # owner funnel routing (dormant — needs WhatsApp link)
scripts/                     # migrate, tag-services, enrich-descriptions, export-thin, import-descriptions, scrap-thin
GSC 29/06/2026 12 months/    # GSC baseline (performance + indexing CSVs)
supabase/migrations/         # 0009 enrichment cols, 0010 service_tags
```
