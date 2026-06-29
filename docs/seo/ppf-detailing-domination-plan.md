# PPF / Detailing / Ceramic / Tint — SEO Domination Plan

_Last updated: 2026-06-29. Source data: `docs/seo/data/` (Semrush, AE database, pulled 2026-06-29)._
_Companion files: [`data-analysis.md`](data-analysis.md) (the diagnosis), [`keyword-targets.md`](keyword-targets.md) (page → keyword map)._

## TL;DR

easyauto.ae has **3.2K organic traffic, Authority Score 11, 6 referring domains**. It ranks
**page 1 only for navigational brand queries** ("well done car wash", "shiners") via accidental
business-listing matches. **Every commercial category head term ranks position 34–71** (page 4–8)
because there are **no category hub pages**. The opportunity is not more traffic breadth — it's
converting toeholds we already hold into page-1 rankings on a focused cluster.

**Niche priority order (by winnability × value):**
1. **Ceramic coating** — lowest difficulty (KD 5–13), clean local intent, we already sit #44 on
   `ceramic coating abu dhabi`.
2. **Car tinting** — highest volume (`car tint near me` 2,900; `car tinting dubai` 1,600), KD 10–19.
3. **PPF** — higher difficulty (KD 32–33) but highest CPC ($6–7) and it's the owner's own shop
   (Grand Touch). We already sit #68–71 on `ppf dubai` / `paint protection film dubai`.
4. **Detailing / polishing** — mid difficulty, broad, good geo long-tail.

## Rollout sequencing — migration-gated waves (DO NOT launch all at once)

Building everything is fine; **publishing it all simultaneously hurts rankings.** A migration is
already a high-risk SEO event, and dumping 100+ new pages on top of it (a) muddies Google's "trusted
site moved" signal and (b) recreates the "crawled–not-indexed" thin-page problem on the new domain.
The constraint is **Google's quality/indexing threshold, not build capacity.** Ship in waves, each
gated on the previous one getting indexed + ranking.

| Wave | Ships | Gate to advance |
|---|---|---|
| **0 — Migrate clean** | WP → new directory, existing content only, 301 redirect map (`data/old-urls.json`), sitemaps submitted | Indexing recovers + rankings hold (~2–4 wks in GSC) |
| **1 — Ceramic cluster** | `/ceramic-coating-dubai` hub + Dubai/AbuDhabi/Sharjah listicles + price guide | Cluster indexed + moving toward page 1 |
| **2 — Tinting cluster** | hub + geo listicles (highest volume) | model re-proven |
| **3 — PPF cluster** | hub + guides (Grand Touch tie-in) | |
| **4 — Detailing + full geo expansion** | replicate winners across all areas | — |

Ceramic leads because it's lowest difficulty (KD 5–13) and already #44 on Abu Dhabi — fastest proof.

**Hard rule, every wave:** only publish a geo page where there are **real listings + reviews to
aggregate**. Empty permutations are thin pages — they won't index and they drag the whole cluster
down. Quality-gate each page; never auto-generate empty area permutations.

_Note: the GSC coverage report in `data/gsc-coverage-2026-06-29/` reflects the OLD WordPress site.
Indexing fixes (internal linking, thin/pinned-page cleanup) are built into the new directory and
expected to resolve on migration — treat that report as a pre-migration baseline, not a current blocker._

## The core diagnosis (why we're stuck)

| Query type | Example | Current position | Why |
|---|---|---|---|
| Navigational (brand) | "well done car wash" | **1** | Listing page accidentally matches the brand |
| Commercial category | `paint protection film dubai` (590) | **68** | No hub page targeting it |
| Commercial category | `ppf dubai` (590, KD 33) | **71** | Only a single business-listing page ranks |
| Commercial category | `ceramic coating abu dhabi` (140, KD 5) | **44** | Thin toehold, no supporting content |
| Commercial category | `car detailing sharjah` (480) | **34** | Thin toehold |
| Commercial category | `tinting dubai` (170) | **67** | No hub |

We rank for the *names of businesses we list*, not the *services people search*. Fixing that is
the entire game. Full evidence in [`data-analysis.md`](data-analysis.md).

---

## Phase 1 — Build the category hubs (the money pages) [HIGHEST PRIORITY]

The directory's unfair advantage over individual shops is **aggregation + reviews + per-area
coverage**. Build hub-and-spoke per service, with "best [service] in [area]" listicles backed by
real listings and `review_keywords`.

**Pillar hubs (one each):**
- `/ceramic-coating-dubai` — "Ceramic Coating in Dubai: Costs, Best Shops & What to Know (2026)"
- `/car-tinting-dubai`
- `/ppf-dubai` — "Paint Protection Film (PPF) in Dubai"
- `/car-detailing-dubai`

**Commercial listicle pages (directory's edge — these are what rank + convert + get cited by AI):**
- Best Ceramic Coating in Dubai / Abu Dhabi / Sharjah
- Best Car Tinting in Dubai / Abu Dhabi / Sharjah / Ajman + per-area (Al Quoz, Mussafah)
- Best PPF Shops in Dubai / Abu Dhabi
- Best Car Detailing in Dubai + per-area (Al Quoz, Business Bay, JLT, Al Barsha, DIP)

Per-area pages win the long tail with near-zero competition (e.g. `car tinting al quoz` 140, KD 12 —
we're already #23). Exact targets and volumes in [`keyword-targets.md`](keyword-targets.md).

**Each hub/listicle must include:** H2 question headings, a **price table** (AED ranges), a
"What customers mention" block from `review_keywords`, star ratings, and FAQ + Service +
AggregateRating schema (see Phase 5).

## Phase 2 — Supporting content (informational + AI-citation capture)

These feed the hubs and are what ChatGPT/Gemini quote (we're already cited on 107 pages — press it).
Each targets a real question with a pricing table + FAQ schema.

| Page | Target term(s) | Vol / KD |
|---|---|---|
| Ceramic Coating Price in Dubai/UAE | `ceramic coating price in uae` / `...in dubai` | 110/9, 50/9 |
| Ceramic Coating vs PPF | `ceramic coating vs ppf`, `ppf vs ceramic coating` | 30/10, 20 |
| How long does ceramic coating last (UAE heat) | `how long does ceramic coating last` | 20 |
| Is ceramic coating worth it | `is ceramic coating worth it` | 20 |
| Car Window Tint Rules in the UAE | `car window tinting rules in uae`, `dubai car tint rules` | 110/13, 30/7 |
| PPF Cost in Dubai (price table) | `ppf coating`, `ppf cost`, `car ppf cost` | 590/9, 20 |
| Best PPF brands (XPEL vs 3M vs STEK) | `3m ppf vs xpel`, `top ppf brands` | 30, 20 |

The "PPF Cost in Dubai 2026" + "Ceramic Coating Price" pages double as **digital-PR assets** (Phase 4).

## Phase 3 — Internal linking (what physically lifts page-4 → page-1)

- Every PPF/ceramic/tint/detailing **listing** links up to its area listicle + the pillar hub.
- Every **guide** links down to the relevant listicle ("see the best-rated ceramic shops →").
- Pillars link to all sub-guides + all area pages.
- "Related services" block cross-links PPF ↔ ceramic ↔ tint ↔ detailing.
- Point internal links at the **existing toeholds first** (`ceramic coating abu dhabi` #44,
  `car detailing sharjah` #34, `ppf dubai` #71) to concentrate equity where we're closest.

## Phase 4 — Authority / backlinks [CO-PRIMARY LEVER — we have only 6 ref domains]

From a base of 6, going to ~40 quality referring domains moves the needle more here than almost
anything. The competitors' backlink profiles are **mostly spam** (see `backlinks_matrix (1).csv` —
`seo-anomaly-*`, `bhs-links-*`, blogspot/web.app junk), which means the real authority domains that
link to competitors but **not** us are the hit-list:

**Realistic UAE authority targets (they link to lexus.ae / ceramicpro / 3mae, not us):**
khaleejtimes.com (71), thenationalnews.com (65), almrsal.com (53), albawaba.com (37),
esquireme.com (43), harpersbazaararabia.com (44), dubicars.com (44), arabwheels.ae (45),
hidubai.com (48), eyeofriyadh.com (51), foodiva.net (39), zawya.com (49).

**Tactics, in order:**
1. **Grand Touch site → easyauto hubs** (owned, do day one).
2. **Digital PR:** publish the PPF/ceramic price studies, pitch to the UAE media above.
3. **Brand installer locators:** XPEL / STEK / LLumar / 3M authorized-installer pages.
4. **Local citations:** hidubai, dubicars, arabwheels, yellowpagesae, UAE directories.
5. **Communities** (referral + discovery): r/dubai, UAE car groups answering "best ceramic/PPF Dubai".

Avoid the spam networks the competitors used — they're a liability, not a moat.

## Phase 5 — AEO (we're already cited — lock it in)

Make every cluster page maximally quotable: clear H2 questions, concise answer paragraphs,
**comparison + price tables**, and FAQ + Service + AggregateRating JSON-LD (code refs:
`src/lib/structured-data.ts`). The "best [service] in [area]" listicles with star ratings are exactly
what AI answers pull. Many target terms already show **AI Overview** in SERP features — structure for it.

## Phase 6 — Measurement

- Semrush **Position Tracking** project loaded with the [`keyword-targets.md`](keyword-targets.md) list (AE, mobile + desktop), tagged by sub-cluster.
- Weekly: watch the **strike zone (pos 8–20)** for the cluster — fastest page-1 wins.
- Monthly: **referring domains** (the leading indicator for this site) and **AI mentions**.

**Build order:** Phase 1 hubs → Phase 3 internal links (cheap, immediate) → Phase 2 guides →
Phase 4 backlinks (Grand Touch link day one) → Phase 5 schema everywhere → Phase 6 tracking from day one.

## Known data gaps (next Semrush pulls)

- `detailing_broad-match` was too large to fully parse here — re-pull a **filtered** detailing
  set (geo + "car detailing" only) to finalize detailing targets.
- The two `gap.keywords` files (3,100+ rows each) hold competitor-only keywords — mine for
  additional zero-competition long-tail once the hubs exist.
