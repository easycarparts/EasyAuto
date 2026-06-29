# Indexing Analysis — why ~3,000 pages weren't indexed, and whether the rebuild fixes it

_Last updated 2026-06-29. Data: GSC Page-Indexing export (`data/gsc-coverage-2026-06-29/`),
old WordPress XML, Semrush AE positions. Per-URL file: [`data/page-index-status.csv`](data/page-index-status.csv)._

## TL;DR

The old WordPress site had **4,535 business pages**, but the bulk were never indexed because they
were **catastrophically thin or duplicated**. The new app fixes the structural causes (thin content,
duplicates, internal linking) — so indexing should improve materially — but **listings with little
real data (no reviews/hours/description) will likely stay unindexed, and that's fine.**

| Status of old business pages | Count | % |
|---|---|---|
| **RANKING** (search-visible → indexed) | 731 | 16% |
| **CONSOLIDATED_DUPLICATE** (now 301-redirected) | 511 | 11% |
| **NO_VISIBILITY** (not indexed / indexed-but-dead) | 3,293 | 73% |

This matches GSC almost exactly: **2,024 "Crawled – not indexed" + 1,024 "Discovered – not
indexed" = 3,048** ≈ our 3,293 no-visibility pages.

> **Two caveats.** (1) GSC's Page-Indexing export is **counts only** — it does *not* contain the
> per-URL list, so `page-index-status.csv` is built from Semrush rankings (confirmed-indexed) vs the
> WP sitemap (total). (2) These GSC counts are **pre-migration WordPress data** — Google hasn't
> recrawled the new app yet. To get the *exact* not-indexed URLs, drill into each issue in GSC and
> "Export" the examples (≤1,000 each), or use the URL Inspection API.

## Why they weren't indexed — root cause is THIN + DUPLICATE content

Measured directly from the WordPress XML (`content:encoded` body text of all 4,535 business posts):

| Old WP business-page body | Finding |
|---|---|
| **Completely empty body** | **1,649 pages (36%)** — zero words of content |
| Median body text (non-empty) | **238 chars (~40 words)** |
| 25th percentile | 75 chars |
| Largest page | 838 chars (~140 words) |

A directory of 4,500 near-identical, ~40-word (or empty) pages is the textbook trigger for
**"Crawled/Discovered – currently not indexed"** — Google crawls them, decides they add no unique
value, and drops them. Compounding factors:
- **511 outright duplicate listings** (same business under multiple slugs) → "Duplicate" buckets.
- **419 "Alternative page with proper canonical"** — canonicalized variants (mostly *intentional*, not a real problem).
- **Low domain authority (AS 11, 6 ref domains)** → small crawl budget, so Google won't spend effort indexing thousands of thin pages.

## Have we made enough changes? Compare WP → new app

**Yes for the structural causes.** Same page (`/business/oasis-carwash`), before vs after:

| | Old WordPress | New app |
|---|---|---|
| Body content | empty or ~40 words | **~2,400 words rendered** |
| Reviews | none on-page | review content + "What customers mention" block |
| Hours / address | minimal | opening hours + PostalAddress |
| Schema | none / basic | **LocalBusiness + AggregateRating + GeoCoordinates + BreadcrumbList** |
| Related/nearby | none | nearby + similar businesses (internal links) |
| Duplicates | 511 dupes live | **consolidated → 308 redirects** |
| Canonicals | inconsistent | clean self-referencing (verified live) |

So the new pages are **dramatically richer and properly structured** — the exact things that flip
"crawled-not-indexed" → indexed.

**But be realistic about the long tail.** Much of those 2,400 words is shared template (nav,
related listings, footer). The genuinely *unique* content per page is the business's **reviews,
hours, name, category, address**. So:
- Listings **with real Google reviews/data** → strong unique content → should index well. ✅
- Listings with **few/no reviews and sparse data** → still mostly template → **may stay unindexed.** ⚠️

That's not a failure — those are low-value pages. Fighting to index all 3,293 is the wrong goal.

## Recommendations (priority order)

1. **Don't chase indexing all 3,293.** Enrich only the ones that matter — listings in the
   high-value categories (PPF, ceramic, detailing, tinting) and any with decent reviews. Add unique
   copy: services offered, area context, a short FAQ.
2. **Consolidate the truly empty long tail.** Businesses with no reviews/hours/description add more
   value *inside* a category/area page than as standalone thin pages. Consider folding them in.
3. **Internal links from indexed hubs → priority listings** — directly addresses the 1,024
   "Discovered – not indexed" (Google found them but didn't bother crawling; links raise priority).
4. **Consider `noindex` on genuinely valueless listings** (no reviews, no hours, no description).
   Counterintuitive, but it concentrates crawl budget on the pages you *want* indexed.
5. **Build authority (backlinks).** More authority = more crawl budget = more of the long tail
   indexes on its own. See [`ppf-detailing-domination-plan.md`](ppf-detailing-domination-plan.md) Phase 4.
6. **Submit the clean sitemap (done) and monitor GSC** Page-Indexing weekly — expect the
   "not indexed" number to fall as Google recrawls the richer pages over the coming weeks.

## Files produced

- [`data/page-index-status.csv`](data/page-index-status.csv) — every business URL tagged
  `RANKING` / `CONSOLIDATED_DUPLICATE` / `NO_VISIBILITY`. The `NO_VISIBILITY` rows are your
  improve-or-consolidate worklist; filter to the high-value categories first.
