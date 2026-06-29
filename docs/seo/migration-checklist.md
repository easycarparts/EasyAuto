# Migration Go-Live Checklist (WordPress → new directory)

_Prepared 2026-06-29. Risk score: **3.5/10 — LOW–MODERATE.** Migrate the existing site in one hit;
hold the new SEO clusters (ceramic/tint/PPF/detailing) for post-migration waves (see
[ppf-detailing-domination-plan.md](ppf-detailing-domination-plan.md) → Rollout sequencing)._

## What was verified

| Check | Result |
|---|---|
| Business URL mapping | ✅ all 4,535 old sitemap URLs are single-segment `/business/{slug}/` → match new `/business/[slug]` 1:1 |
| **Category coverage spot-check** | ✅ **96/96 live old categories present in `data/categories.json` — 0 would 404**; 102 orphans redirected; 198 total accounted for |
| Unknown category slug | ✅ `notFound()` (real 404) at `business-category/[slug]/page.tsx:175` |
| Dedup duplicate slugs | ✅ 519 slugs 308 → canonical (`dedup-redirects.json`) |
| Legacy pages/permalinks | ✅ submit/dashboard/sample/author + `/2025/..` post 308s in place |
| **Place-id legacy permalinks** | ✅ **NEW redirect added** — `/business/{slug}/{placeid}` → `/business/{slug}` (see below) |
| Sitemap continuity | ✅ new sitemap served at all old Yoast URLs via rewrite (no 301 risk) |
| Image hosts | ✅ wp-content removed; Cloudinary + Google hosts whitelisted in `next.config.ts` |
| `redirects.ts` lint | ✅ eslint exit 0 |

## Change made this session

Added `BUSINESS_LEGACY_PERMALINK_REDIRECTS` to `src/lib/redirects.ts` — collapses old 2-segment
WordPress permalinks (`/business/{slug}/{placeid}/`) to the canonical single-segment slug. The
`{19,}` length guard on the place-id segment was unit-tested to confirm it **cannot** match the real
`/business/{slug}/blog` routes and **cannot** loop (single-segment destination ≠ 2-segment source):

```
PASS  place-id permalink            -> redirects
PASS  place-id (trailing slash)     -> redirects
PASS  canonical /business/{slug}    -> NOT matched (no loop)
PASS  /business/{slug}/blog         -> NOT matched (blog safe)
PASS  /business/{slug}/blog/{post}  -> NOT matched
PASS  short 2nd segment (<20 chars) -> NOT matched
```

## Live test results — staging `easy-auto-kweh.vercel.app` (2026-06-29)

Tested against the deployed preview. **Build under test: commit `dd7837d` (predates the place-id fix).**

| Test | Result |
|---|---|
| Listings, no trailing slash (×10) | ✅ 200 |
| Listings, **with** trailing slash | ✅ 1-hop 308 → 200 (old sitemap URLs all have trailing slashes; one clean hop each — expected & acceptable, no action needed) |
| Dedup slug → canonical | ✅ 308 → 200 (`welldone-car-wash-3` → `welldone-car-wash`) |
| Orphan category → hub | ✅ 308 → 200 (`tire-repair-shop` → `tyres-and-wheels`) |
| Orphan category → home | ✅ 308 (`mosque` → `/`) |
| Categories / group hubs / near-me | ✅ 200 |
| Sitemaps (new + old Yoast URLs) | ✅ 200 |
| 404 behaviour | ✅ real 404 (no soft-200) |
| Home | ✅ 200 |
| **Place-id permalink → canonical** | ✅ **CONFIRMED on redeploy** (commit `a313067`) — `/business/{slug}/{placeid}` → 308 → `/business/{slug}` → 200; with trailing slash 2 hops → 200; guard verified (`/business/{slug}/blog` = 404, not 308). |

**Net: all green.** Every test passes on the deployed build. Migration is technically ready — proceed with the
DNS-flip pre-flight below. Trailing-slash 308s are expected and fine.

## Pre-flight (do on staging, before DNS flip)

1. **Smoke-test top-traffic URLs return 200** (top 30 by AE traffic below).
2. **Test the redirects fire** (expect 308 + correct `Location`):
   - `/business/mrcap-al-quoz/af1qipoijuvljxxf0hjlguqvtqwhkskj_ihsmtoiiqans1024/` → `/business/mrcap-al-quoz`
   - `/business/welldone-car-wash-3` → `/business/welldone-car-wash` (dedup)
   - `/business-category/mosque` → `/` (orphan → home)
   - `/business-category/tire-repair-shop` → `/business-category/tyres-and-wheels` (orphan → hub)
   - `/business/welldone-car-wash/blog` → **200, NOT redirected** (guard check)
3. **Confirm 404 page returns HTTP 404** (not soft-200) — old site had 2 soft-404s; don't inherit.
4. **`/sitemap.xml` and old Yoast URLs** (`/sitemap_index.xml`, `/business-sitemap.xml`…) all serve the new sitemap.

## Cutover day

5. Flip DNS / deploy.
6. **Submit new sitemap in GSC** immediately; keep old WP sitemap reachable a few weeks so 301/308s get crawled.
7. Use GSC **URL Inspection** on 3–4 top URLs to confirm Google sees 200 / correct canonical.

## Post-migration monitoring (2–4 weeks, before shipping Wave 1)

8. GSC **Page Indexing** — watch "crawled/discovered – not indexed" recover (old WP baseline in
   `data/gsc-coverage-2026-06-29/`).
9. GSC **Performance** — expect a brief dip then recovery; flag any URL that loses ranking and didn't redirect.
10. Spot-check that dedup-redirected top earners (e.g. `welldone-car-wash-3`, 115 traffic) pass their
    ranking to the canonical.
11. Only once indexing + rankings are stable → start **Wave 1 (ceramic cluster)**.

## Top 30 AE traffic pages — smoke test (expect 200)

| Traffic | Path |
|--:|---|
| 694 | /business/adnoc-service-station-khalifa-city-766/ |
| 316 | /business/enoc-1077-jvc/ |
| 178 | /business/prowash-1050/ |
| 115 | /business/welldone-car-wash-3/  ⚠️ dedup → /business/welldone-car-wash |
| 98 | /business/baghdad-auto-spare-parts-trading-establishment/ |
| 80 | /business/skyline-auto-repair-workshop-llc/ |
| 69 | /business/bab-alsatwa-car-accessories/ |
| 62 | /business/car-wash-havoline-caltex-sharjah/ |
| 61 | /business/bubbles-foams-car-washing-station/ |
| 58 | /business/oasis-carwash/ |
| 53 | /business/prowash-7825/ |
| 52 | /business/al-futtaim-automall-dubai-festival-city/ |
| 51 | /business/alba-cars-marina-mall-abu-dhabi/ |
| 50 | /business/rccr-motors-auto-repair/ |
| 50 | /business/one-piece-car-wash-and-polishing/ |
| 47 | /business/al-barakah-car-wash/ |
| 38 | /business/enoc-1029-discovery-gardens/ |
| 36 | /business/free-look-auto-repairing/ |
| 31 | /business/grand-service-station-al-warqa/ |
| 29 | /business/very-easy-car-sell-my-car-sell-any-car/ |
| 29 | /business/samira-auto-spare-parts-ajman/ |
| 28 | /business/adnoc-service-station-production-city-329/ |
| 26 | /business/wheel-to-wheel-auto-service-station/ |
| 26 | /business/oldtimer-motorcycles/ |
| 24 | /business/insurancemarket-ae/ |
| 24 | /business/al-ghazal-car-washing-station/ |
| 23 | /business/sellanycar-com-dubai-umm-suqeim-street/ |
| 22 | /business/car-centre-service-sharjah/ |
| 22 | /business/aksa-trade-auto-spare-parts-accessories/ |
| 19 | /business/al-tawash-neon/ |
