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

### ☐ Step 1 — SEO baseline (do before changing anything)
*No dependency.*
- Pull the full old URL list from `https://easyauto.ae/sitemap_index.xml` (incl. the 5 business sub-sitemaps).
- Save it in the repo (e.g. `data/old-urls.json`) — it's the master list every page must still answer.
- Snapshot current top pages/queries from Google Search Console for a "before" comparison.

### ☐ Step 2 — Design system + page shells (NEW look)
*No DB needed — build against `data/*.json` as sample data.*
- Establish the visual design (Tailwind theme, components: header, footer, cards, search bar).
- Build the route shells as **server components** (SEO-safe):
  - `/` homepage
  - `/business-category/[slug]` category listing (paginated)
  - `/business/[slug]` single listing (rating, map, hours, contact, photos, description)
  - `/news` + `/news/[slug]`
- Add `generateMetadata` (titles/descriptions) + JSON-LD `LocalBusiness` structured data per listing.

### ☐ Step 3 — Restructure categories
*Depends on Step 2 (pages exist to test against).*
- Propose a clean top-level taxonomy (e.g. Detailing & Protection, Wash, Tinting & Wrapping, Repair &
  Maintenance, Parts & Accessories, Towing & Recovery, Dealers, Body & Paint, Tyres & Wheels…).
- Map all 96 raw categories → new taxonomy; keep raw category as a sub-filter.
- **Write the old-slug → new-slug 301 redirect map** (in `next.config.ts` or middleware). Critical for SEO.

### ☐ Step 4 — Wire up live data
*Depends on the human setup in HANDOVER §2 (schema run + import done).*
- Point the pages at Supabase instead of the JSON sample data.
- Verify counts, images, and that slugs render correctly.

### ☐ Step 5 — Programmatic growth pages
*Depends on Step 4.*
- `/[category]-in-[city]` pages generated from distinct cities × categories (the traffic-growth lever).
- `generateStaticParams`, per-page metadata, internal linking from category/listing pages.

### ☐ Step 6 — Lead engine
*Depends on Step 4. Needs owner's funnel target.*
- `LeadButtons` component on every listing: WhatsApp / Call / Get-a-quote → `insert into leads`.
- Quote-form modal → `leads`.
- Routing config: high-intent categories → owner's own services funnel; others → generic lead capture.

### ☐ Step 7 — Supabase Auth + Submit / Claim a business
*Depends on Step 4.*
- Supabase Auth (email/OAuth) for business owners.
- "Submit your business" form → writes a pending `businesses` row (admin approves).
- "Claim this business" flow + an owner dashboard to edit their listing.
- Admin view to read `leads` and approve submissions (service_role, server-side).

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
