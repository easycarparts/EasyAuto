# Easy Auto — Handover & Build Plan

> **Read this first** for full context, then follow **`ROADMAP.md`** for the ordered task list
> and the copy-paste kickoff prompt. Nothing here assumes you saw the earlier conversation.
>
> **Two standing design decisions:** (1) build a **fresh, modern design** — do NOT copy the old
> WordPress look, but keep its URLs for SEO. (2) the categories will be **restructured** into a
> sensible taxonomy, with 301 redirects from old category URLs.

---

## 1. What this project is

A rebuild of **easyauto.ae** — a UAE auto-services **business directory** (car wash, towing, auto parts,
detailing, etc.) — moving OFF WordPress onto a self-maintainable **Next.js + Supabase** stack.

**Why we're rebuilding:**
- The WordPress site had broken plugin features (add-business / submissions) the owner can't fix.
- The owner can work in React + Supabase themselves → no recurring developer cost.
- WordPress was too limiting for what they want to do.

**The goal is not just to copy the site — it's to turn it into a lead engine:**
1. **Preserve** the ~1.3k/mo organic SEO traffic (do not break Google).
2. **Grow** it with programmatic location × category pages.
3. **Capture leads** on every listing and **funnel high-intent categories to the owner's own
   services** (car detailing / PPF). Keep the data flexible to later sell leads to businesses or
   sell sponsored placements.

---

## 2. START HERE — setup that needs the human (blocking)

These need the owner and aren't done yet. The owner said Supabase keys will be provided **later**, so
you can build everything that doesn't need a live database first (pages render with mock/sample data,
then flip to live once keys land).

- [ ] **Rotate the Supabase secret key.** The `service_role` key was exposed in an earlier chat. Owner must
      regenerate it (Supabase → Settings → API) and paste it into `.env.local` → `SUPABASE_SERVICE_ROLE_KEY=`.
- [ ] **Run the schema.** Paste all of `supabase/schema.sql` into Supabase → SQL Editor → run.
- [ ] **Import the data.** With the rotated secret in `.env.local`: `npm run import`
      (loads 4,535 businesses, 96 categories, 4 news). Re-extract first with `npm run extract` if needed.
- [ ] **Create a NEW Vercel project** by importing the GitHub repo (see §5). Do **not** reuse grand-touch's
      Vercel project. Copy the `.env.local` values into the Vercel project's Environment Variables.

Everything else below can proceed without the human.

---

## 3. Current state (already done ✅)

- **Next.js 16** app scaffolded: TypeScript, App Router, Tailwind 4, ESLint, Turbopack. `npm run build` passes.
- **Supabase client** at `src/lib/supabase.ts` (uses the publishable/anon key).
- **`supabase/schema.sql`** — tables modeled from the real WordPress export (see §4).
- **WordPress data extracted** into `data/` (committed, ~11 MB):
  - `data/businesses.json` — 4,535 listings (4,095 with an image)
  - `data/categories.json` — 96 categories
  - `data/news.json` — 4 posts
- **`scripts/extract-wordpress.mjs`** — parses the 62 MB WP export → the JSON above. `npm run extract`.
  Default input path: `C:/Users/seane/Downloads/easyauto.WordPress.2026-06-27.xml`
  (override: `npm run extract -- path/to/export.xml`). The raw 62 MB XML is **not** in the repo.
- **`scripts/import-to-supabase.mjs`** — loads the JSON into Supabase. `npm run import`.
- **`.env.local`** wired with Supabase URL + publishable key, and Cloudinary cloud name + preset.
  (`.env.local` is git-ignored — secrets never get pushed.)

---

## 4. The data model (`supabase/schema.sql`)

| Table | Rows | Key columns | URL it powers |
|-------|------|-------------|---------------|
| `categories` | 96 | `slug`, `name`, `listing_count` | `/business-category/<slug>/` |
| `businesses` | 4,535 | `slug`, `name`, `category_slug`, `rating`, `google_reviews`, `address`, `city`, `phone`, `website`, `latitude`, `longitude`, `hours`, `place_id`, `thumbnail_url`, `review_keywords`, `competitors` | `/business/<slug>/` |
| `news` | 4 | `slug`, `title`, `content`, `thumbnail_url` | `/news/<slug>/` |
| `leads` | 0 (by design) | `business_id`, `category_slug`, `city`, `action`, `routed_to`, `name`, `phone`, `email`, `message`, `source` | — the money table |

**Row Level Security is ON:** anyone can READ the catalog and INSERT a lead; only the `service_role`
key can read leads or modify the catalog.

Top categories: car-wash (1073), auto-parts-store (730), towing-service (525), car-dealer (344),
auto-repair-shop (241), car-accessories-store (167), used-car-dealer (139), vehicle-wrapping (138),
car-detailing-service (122), window-tinting (103)…

---

## 5. The build plan — what to actually build next

### Phase 0 — SEO baseline (cheap insurance, do before launch)
- The live URL master list is the Yoast sitemap: `https://easyauto.ae/sitemap_index.xml`
  (11 sub-sitemaps; businesses span `business-sitemap.xml` … `business-sitemap5.xml`).
- Snapshot top pages + queries from Google Search Console to compare against after launch.

### Phase 1 — Data ✅ done (just needs the human to run import, see §2)

### Phase 2 — The pages Google sees (server-rendered — the SEO core)
Build these as **server components** so Google gets full HTML. Routes (App Router):
- `src/app/page.tsx` — homepage: search box, top categories, featured/high-rating listings.
- `src/app/business-category/[slug]/page.tsx` — listings in a category (paginated).
- `src/app/business/[slug]/page.tsx` — single listing: name, rating, address, map, hours, contact
  buttons, description, photos.
- `src/app/news/[slug]/page.tsx` and a news index.
- **Programmatic growth pages** — `/[category]-in-[city]` (e.g. `car-wash-in-dubai-marina`). Generate from
  distinct `city` values × categories. This is the lever to grow past 1.3k/mo. Use `generateStaticParams`.
- For each page add `generateMetadata` (title/description) and **JSON-LD `LocalBusiness`** structured data
  (we have rating, address, geo, hours → eligible for rich results).
- Add a generated `app/sitemap.ts` and `robots.ts`.

### Phase 3 — The lead engine (the point of the whole thing)
- A reusable `LeadButtons` client component on every listing: **WhatsApp**, **Call**, **Get a quote**.
  Each click `insert`s into `leads` (action, business_id, category_slug, city, source) via the anon client.
- A quote form (modal) that also writes to `leads`.
- **Routing logic:** for high-intent categories matching the owner's own services
  (detailing, PPF, car-wash, window-tinting, vehicle-wrapping…), the primary CTA routes to the owner's
  **own WhatsApp/booking funnel** instead of the listed business. All other categories capture a generic
  lead. Keep this a simple config map so it's easy to change. (Owner's own funnel target = TBD — ask them
  for the WhatsApp number / booking URL when starting Phase 3. See [grand-touch PPF funnel] context.)
- A simple admin view (later) to read `leads` (server-side, service_role).

### Phase 4 — Google-safe launch
- **URLs must match the old WordPress ones 1:1** or have 301 redirects. This is the #1 risk to traffic.
  Slugs in `data/businesses.json` already match (`/business/<slug>/`). Verify category + news slugs too.
- Generate & submit the new `sitemap.xml` in Search Console.
- Deploy to the new Vercel project, point easyauto.ae at it, watch rankings ~2 weeks vs. the Phase 0 snapshot.

---

## 6. Reference

### Local dev
```bash
npm install      # if needed
npm run dev      # http://localhost:3000
npm run build    # production build (currently passes)
npm run extract  # WP XML -> data/*.json
npm run import   # data/*.json -> Supabase (needs service_role key)
```

### Accounts & keys
- **GitHub:** https://github.com/easycarparts/EasyAuto (account `easycarparts`, branch `main`, public).
  `gh` CLI is authenticated as `easycarparts`.
- **Supabase:** project `qsuawztcgpheaxewzbyt` (region Tokyo / ap-northeast-1).
  URL `https://qsuawztcgpheaxewzbyt.supabase.co`. Publishable/anon key is in `.env.local`.
  **service_role secret still needs rotating + adding** (see §2).
- **Cloudinary:** cloud name `diw6rekpm` (shared with grand-touch / WEBAPP, public). Unsigned preset
  `gts-video-360` exists (video). For listing images, create an image preset (e.g. `easyauto-listings`).
  No API secret exists in any repo — uploads are unsigned via preset, or use Supabase Storage.
- **Vercel:** create a NEW project from the GitHub repo. Do NOT reuse grand-touch's project.

### Env vars (`.env.local`, not committed — template in `.env.example`)
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY        (publishable key — set)
SUPABASE_SERVICE_ROLE_KEY            (TODO: rotate + paste)
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME    (diw6rekpm)
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET (gts-video-360; make an image one)
CLOUDINARY_API_KEY / _SECRET         (blank — only for bulk image migration)
```

---

## 7. Gotchas / open items
- **Listing images** currently point at `https://easyauto.ae/wp-content/uploads/...`. They work while
  WordPress is still up but **break once it's gone**. Before final cutover, batch-download the 4,095 images
  and re-upload to Cloudinary or Supabase Storage, then update `thumbnail_url`.
- **`businesses.json` is ~11 MB** (committed so import works without the raw export). Keep the 62 MB WP XML
  safe outside the repo.
- **`competitors` / `review_keywords`** are stored as raw text — gold for SEO content later, not parsed yet.
- **The project folder may be moved** — paths in this doc are relative to the repo root where possible.
  The WordPress XML default path (`C:/Users/seane/Downloads/...`) is the one absolute path; pass a new path
  to `npm run extract` if it moved.
- **Owner's own-services funnel target** (WhatsApp/booking URL) is needed for Phase 3 routing — ask for it.
