// Data-access layer (Step 4 — live Supabase).
//
// Reads the public catalog from Supabase via the anon key (RLS allows public
// SELECT on categories/businesses/news). Queries are TARGETED: a listing page
// fetches one row, a category page fetches one page of rows with an exact count.
// The big "scan" helpers (cities, all slugs) select only the single column they
// need, so we never pull the heavy description/competitors text in bulk — that
// was overwhelming PostgREST when 10 build workers fetched everything at once.
//
// Signatures are unchanged from the JSON-backed version, so pages didn't change.

import { cache } from "react";
import { supabase } from "./supabase";
import type { Business, BusinessMedia, Category, NewsPost } from "./types";
import { getEmirate, type Location } from "./locations";

export type Page<T> = {
  items: T[];
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
};

// ---------------------------------------------------------------------------
// Query runner with retry/backoff. `next build` renders thousands of pages
// across 10 worker processes hitting PostgREST concurrently, so a transient
// failure under load must not abort the whole build.
// ---------------------------------------------------------------------------
// Loosely-typed shape that any supabase-js query response satisfies. The caller
// asserts the concrete row type via the generic on `run`.
type QueryResult = { data: unknown; error: { message: string } | null; count?: number | null };

async function run<T>(
  label: string,
  query: () => PromiseLike<QueryResult>,
  attempts = 5,
): Promise<{ data: T | null; count: number | null }> {
  let lastError = "";
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const res = await query();
      if (!res.error) return { data: (res.data ?? null) as T | null, count: res.count ?? null };
      lastError = res.error.message;
    } catch (e) {
      lastError = e instanceof Error ? e.message : String(e);
    }
    const delay = 250 * 2 ** attempt + Math.floor(Math.random() * 200);
    await new Promise((r) => setTimeout(r, delay));
  }
  throw new Error(`Supabase ${label}: ${lastError}`);
}

// Page through a light, single-column selection (≤ a few thousand small rows).
async function selectColumn<T>(
  table: string,
  column: string,
  orderBy: string,
): Promise<T[]> {
  const pageSize = 1000;
  const out: T[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data } = await run<T[]>(`${table}.${column}[${from}]`, () =>
      supabase.from(table).select(column).order(orderBy, { ascending: true }).range(from, from + pageSize - 1),
    );
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

function toPage<T>(items: T[], total: number, page: number, perPage: number): Page<T> {
  return {
    items,
    total,
    page,
    perPage,
    totalPages: Math.max(1, Math.ceil(total / perPage)),
  };
}

// ---------------------------------------------------------------------------
// Categories  (96 rows — load once per process and reuse)
// ---------------------------------------------------------------------------
let categoriesPromise: Promise<Category[]> | null = null;
function loadCategories(): Promise<Category[]> {
  categoriesPromise ??= selectColumn<Category>("categories", "*", "slug");
  return categoriesPromise;
}

export const getAllCategories = cache(async (): Promise<Category[]> => {
  const cats = await loadCategories();
  return [...cats].sort((a, b) => b.listing_count - a.listing_count);
});

export const getCategoryBySlug = cache(
  async (slug: string): Promise<Category | null> => {
    const cats = await loadCategories();
    return cats.find((c) => c.slug === slug) ?? null;
  },
);

export const getCategoriesBySlugs = cache(
  async (slugs: string[]): Promise<Category[]> => {
    const cats = await loadCategories();
    const bySlug = new Map(cats.map((c) => [c.slug, c]));
    return slugs
      .map((s) => bySlug.get(s))
      .filter((c): c is Category => Boolean(c))
      .sort((a, b) => b.listing_count - a.listing_count);
  },
);

// ---------------------------------------------------------------------------
// Businesses
// ---------------------------------------------------------------------------
export const getBusinessBySlug = cache(
  async (slug: string): Promise<Business | null> => {
    const { data } = await run<Business>(`business ${slug}`, () =>
      supabase.from("businesses").select("*").eq("slug", slug).maybeSingle(),
    );
    return data ?? null;
  },
);

export const getBusinessesByCategory = cache(
  async (slug: string, page = 1, perPage = 24): Promise<Page<Business>> => {
    const start = (page - 1) * perPage;
    const { data, count } = await run<Business[]>(`category ${slug} p${page}`, () =>
      supabase
        .from("businesses")
        .select("*", { count: "exact" })
        .eq("category_slug", slug)
        .order("easy_auto_score", { ascending: false, nullsFirst: false })
        .order("google_reviews", { ascending: false, nullsFirst: false })
        .range(start, start + perPage - 1),
    );
    return toPage(data ?? [], count ?? 0, page, perPage);
  },
);

// Listings across several categories — powers the service-group hub pages (Step 3).
export const getBusinessesByCategorySlugs = cache(
  async (slugs: string[], page = 1, perPage = 24): Promise<Page<Business>> => {
    if (slugs.length === 0) return toPage<Business>([], 0, page, perPage);
    const start = (page - 1) * perPage;
    const { data, count } = await run<Business[]>(`group [${slugs.length}] p${page}`, () =>
      supabase
        .from("businesses")
        .select("*", { count: "exact" })
        .in("category_slug", slugs)
        .order("easy_auto_score", { ascending: false, nullsFirst: false })
        .order("google_reviews", { ascending: false, nullsFirst: false })
        .range(start, start + perPage - 1),
    );
    return toPage(data ?? [], count ?? 0, page, perPage);
  },
);

// Homepage featured section. Editor/paid `featured` picks always lead; the rest
// of the slots rotate daily through the high-score pool (seed = day) so it stays
// fresh and fair rather than showing the same businesses forever.
export const getFeaturedBusinesses = cache(
  async (limit = 8): Promise<Business[]> => {
    // Rotation seed = whole days since epoch; advances once per day. Computed here
    // (not in a component) so it doesn't trip the render-purity lint, and the
    // homepage's daily ISR picks up the new rotation.
    const seed = Math.floor(Date.now() / 86_400_000);
    const [flaggedRes, poolRes] = await Promise.all([
      run<Business[]>("featured-flagged", () =>
        supabase
          .from("businesses")
          .select("*")
          .eq("featured", true)
          .order("easy_auto_score", { ascending: false, nullsFirst: false })
          .limit(limit),
      ),
      run<Business[]>("featured-pool", () =>
        supabase
          .from("businesses")
          .select("*")
          .eq("featured", false)
          .gte("easy_auto_score", 55)
          .order("easy_auto_score", { ascending: false, nullsFirst: false })
          .limit(150),
      ),
    ]);

    const featured = flaggedRes.data ?? [];
    const pool = poolRes.data ?? [];
    const need = Math.max(0, limit - featured.length);
    if (need === 0 || pool.length === 0) {
      return [...featured, ...pool].slice(0, limit);
    }
    const start = ((seed % pool.length) + pool.length) % pool.length;
    const rotated = [...pool.slice(start), ...pool.slice(0, start)].slice(0, need);
    return [...featured, ...rotated];
  },
);

export const getAllBusinessSlugs = cache(async (): Promise<string[]> => {
  const rows = await selectColumn<{ slug: string }>("businesses", "slug", "id");
  return rows.map((r) => r.slug);
});

// Owner-uploaded photos + videos for a listing (Step 1). Public read (RLS).
export const getBusinessMedia = cache(
  async (businessId: number): Promise<BusinessMedia[]> => {
    const { data } = await run<BusinessMedia[]>(`media ${businessId}`, () =>
      supabase
        .from("business_media")
        .select("*")
        .eq("business_id", businessId)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true }),
    );
    return data ?? [];
  },
);

// All category slugs linked to a business (multi-category, Step 1). Public read.
export const getCategorySlugsForBusiness = cache(
  async (businessId: number): Promise<string[]> => {
    const { data } = await run<{ category_slug: string }[]>(`bizcats ${businessId}`, () =>
      supabase.from("business_categories").select("category_slug").eq("business_id", businessId),
    );
    return (data ?? []).map((r) => r.category_slug);
  },
);

// ---------------------------------------------------------------------------
// Location (Step 5)
// ---------------------------------------------------------------------------

// Light facet rows used to compute which /<service>-in-<location> combos have
// inventory (for generateStaticParams) and homepage location counts. Selects only
// the three columns needed — never the heavy text fields.
export type Facet = { category_slug: string | null; city: string | null; address: string | null };

export const getLocationFacets = cache(async (): Promise<Facet[]> => {
  return selectColumn<Facet>("businesses", "category_slug,city,address", "id");
});

// Listings filtered by a service (a set of category slugs, or null = all) AND a
// location (emirate → match city; community → match city + address keyword).
export const getBusinessesByLocation = cache(
  async (
    categorySlugs: string[] | null,
    location: Location,
    page = 1,
    perPage = 24,
  ): Promise<Page<Business>> => {
    const emirate =
      location.kind === "emirate" ? location : getEmirate(location.emirate);
    if (!emirate) return toPage<Business>([], 0, page, perPage);

    const start = (page - 1) * perPage;
    const { data, count } = await run<Business[]>(
      `location ${location.slug} p${page}`,
      () => {
        let q = supabase
          .from("businesses")
          .select("*", { count: "exact" })
          .in("city", emirate.cityNames);
        if (categorySlugs && categorySlugs.length > 0) {
          q = q.in("category_slug", categorySlugs);
        }
        if (location.kind === "community") {
          q = q.or(
            location.keywords.map((k) => `address.ilike.%${k}%`).join(","),
          );
        }
        return q
          .order("easy_auto_score", { ascending: false, nullsFirst: false })
          .order("google_reviews", { ascending: false, nullsFirst: false })
          .range(start, start + perPage - 1);
      },
    );
    return toPage(data ?? [], count ?? 0, page, perPage);
  },
);

export type NearbyBusiness = Business & { distanceKm: number };

// Businesses near a point, sorted by distance. Uses a bounding-box query (cheap,
// indexable) then ranks the candidates by exact Haversine distance.
export const getNearbyBusinesses = cache(
  async (lat: number, lng: number, limit = 24): Promise<NearbyBusiness[]> => {
    const dLat = 0.5; // ~55 km
    const dLng = 0.5 / Math.max(0.2, Math.cos((lat * Math.PI) / 180));
    const { data } = await run<Business[]>(`nearby ${lat.toFixed(2)},${lng.toFixed(2)}`, () =>
      supabase
        .from("businesses")
        .select("*")
        .gte("latitude", lat - dLat)
        .lte("latitude", lat + dLat)
        .gte("longitude", lng - dLng)
        .lte("longitude", lng + dLng)
        .limit(500),
    );
    return (data ?? [])
      .filter((b) => b.latitude != null && b.longitude != null)
      .map((b) => ({ ...b, distanceKm: haversineKm(lat, lng, b.latitude!, b.longitude!) }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  },
);

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Distinct cities with a listing count (raw — used by the footer).
export const getCities = cache(
  async (): Promise<{ city: string; count: number }[]> => {
    const rows = await selectColumn<{ city: string | null }>("businesses", "city", "id");
    const counts = new Map<string, number>();
    for (const r of rows) {
      const c = (r.city ?? "").trim();
      if (!c || c.toLowerCase() === "unknown") continue;
      counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count);
  },
);

// Name/city/description search for the homepage search box (runtime only).
export const searchBusinesses = cache(
  async (query: string, limit = 30): Promise<Business[]> => {
    // Strip characters that have meaning in PostgREST's or()/ilike filter syntax.
    const q = query.trim().replace(/[,()*%]/g, " ").replace(/\s+/g, " ").trim();
    if (!q) return [];
    const term = `%${q}%`;
    const { data } = await run<Business[]>(`search ${q}`, () =>
      supabase
        .from("businesses")
        .select("*")
        .or(`name.ilike.${term},city.ilike.${term},description.ilike.${term}`)
        .order("easy_auto_score", { ascending: false, nullsFirst: false })
        .order("google_reviews", { ascending: false, nullsFirst: false })
        .limit(limit),
    );
    return data ?? [];
  },
);

// ---------------------------------------------------------------------------
// News  (tiny — load once, drop junk/dupes defensively)
// ---------------------------------------------------------------------------
let newsPromise: Promise<NewsPost[]> | null = null;
function loadNews(): Promise<NewsPost[]> {
  newsPromise ??= selectColumn<NewsPost>("news", "*", "id").then((all) => {
    const seen = new Set<string>();
    return all.filter((p) => {
      if (p.slug === "hello-world") return false;
      if (seen.has(p.slug)) return false;
      seen.add(p.slug);
      return true;
    });
  });
  return newsPromise;
}

export const getAllNews = cache(async (): Promise<NewsPost[]> => {
  const news = await loadNews();
  return [...news].sort((a, b) => dateValue(b.published_at) - dateValue(a.published_at));
});

export const getNewsBySlug = cache(
  async (slug: string): Promise<NewsPost | null> => {
    const news = await loadNews();
    return news.find((n) => n.slug === slug) ?? null;
  },
);

function dateValue(iso: string | null): number {
  if (!iso) return 0;
  const t = Date.parse(iso);
  return Number.isNaN(t) ? 0 : t;
}
