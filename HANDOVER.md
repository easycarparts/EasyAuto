# Easy Auto — Handover

Rebuild of **easyauto.ae** (a UAE auto-services directory) from WordPress to a
self-maintainable **Next.js + Supabase** app. Goal: preserve the ~1.3k/mo organic
SEO traffic, **grow it** with programmatic pages, and **capture leads** — funneling
high-intent categories to our own services.

---

## What's already done (in this repo)

- ✅ **Next.js 16** app scaffolded (TypeScript, App Router, Tailwind, ESLint, Turbopack).
- ✅ **Supabase client** at `src/lib/supabase.ts`.
- ✅ **Database schema** at `supabase/schema.sql` — modeled from the real export.
- ✅ **WordPress data extracted** → `data/businesses.json` (4,535), `data/categories.json` (96), `data/news.json` (4).
- ✅ **Import script** at `scripts/import-to-supabase.mjs`.
- ✅ Env wired in `.env.local` (Supabase URL + publishable key).

## 🔴 Do this first (security)

The Supabase **secret / service_role key was exposed** while setting up. Before anything else:
1. Supabase dashboard → **Settings → API** → rotate the JWT / regenerate the secret key.
2. Paste the **new** secret into `.env.local` → `SUPABASE_SERVICE_ROLE_KEY=` (replace the placeholder).
3. Never commit `.env.local` (it's git-ignored) and never paste secret keys into chat.

---

## How to get running

```bash
cd "C:/Users/seane/Desktop/EasyAuto"
npm install            # if dependencies aren't present
npm run dev            # http://localhost:3000
```

### Load the data into Supabase (one time)
1. Supabase → **SQL Editor** → paste & run all of `supabase/schema.sql`.
2. Make sure your rotated secret key is in `.env.local`.
3. Re-extract if needed: `npm run extract` (reads the WordPress XML — see path below).
4. Import: `npm run import` → pushes categories → businesses → news into Supabase.

> **WordPress export location:** `scripts/extract-wordpress.mjs` defaults to
> `C:/Users/seane/Downloads/easyauto.WordPress.2026-06-27.xml`.
> Pass another path as an argument if it moves: `npm run extract -- path/to/export.xml`.

---

## The data model (`supabase/schema.sql`)

| Table | Rows | Notes |
|-------|------|-------|
| `categories` | 96 | `slug` → `/business-category/<slug>/`. car-wash (1073), auto-parts-store (730), towing (525)… |
| `businesses` | 4,535 | `slug` → `/business/<slug>/`. Has rating, Google reviews, address, phone, lat/long, Place ID, competitors, review keywords, image. |
| `news` | 4 | `slug` → `/news/<slug>/`. |
| `leads` | — | **Empty by design.** Every WhatsApp/call/quote click + form writes here. This is the money table. |

**Row Level Security is on:** public can read the catalog and *insert* leads, but only the
server (service_role) can read leads or edit the catalog.

---

## Build roadmap (what's next)

### Phase 0 — SEO baseline (before launch)
- Master URL list lives in the live Yoast sitemap: `https://easyauto.ae/sitemap_index.xml`
  (11 sub-sitemaps; businesses span `business-sitemap.xml` … `business-sitemap5.xml`).
- Snapshot top pages/queries from Google Search Console to measure against post-launch.

### Phase 1 — Data ✅ (done — just run the import)

### Phase 2 — Pages Google sees (server-rendered)
- `/` homepage, `/business-category/[slug]`, `/business/[slug]`, `/news/[slug]`.
- **Programmatic** `/[category]-in-[city]` style pages — the growth lever (4,535 listings × cities).
- Per-page `<title>`/meta + JSON-LD `LocalBusiness` structured data (we have rating, address, geo, hours → rich results).

### Phase 3 — Lead engine
- Tracked **WhatsApp / Call / Get-a-quote** buttons on every listing → `insert into leads`.
- High-intent categories (detailing, PPF, car wash, tinting…) route to **our own** funnel; rest capture generic leads.

### Phase 4 — Google-safe launch
- **URLs must match 1:1** or 301-redirect — the single biggest risk to traffic.
- Generate & submit `sitemap.xml`; deploy to **Vercel**; point easyauto.ae at it; watch Search Console ~2 weeks.

---

## Known gotchas
- **Listing images** currently point at `https://easyauto.ae/wp-content/uploads/...` — they work while
  WordPress is still up, but will break once it's gone. Before final cutover, batch-download images and
  re-upload to Supabase Storage (4,095 listings have an image).
- `businesses.json` is ~11 MB (committed so import works without the raw export). The 62 MB WordPress
  XML is **not** in the repo — keep it safe elsewhere.
- `competitors` / `review_keywords` are stored as raw text — useful later for SEO content, not parsed yet.

---

## Stack & accounts
- **Next.js 16** + React 19 + Tailwind 4 (this repo).
- **Supabase** project `qsuawztcgpheaxewzbyt` (region: Tokyo / ap-northeast-1). URL: https://qsuawztcgpheaxewzbyt.supabase.co
- **Hosting:** deploy to Vercel (connect the GitHub repo).
