// Admin analytics reads. Service-role RPC calls against the aggregation functions
// from migrations 0013/0014 — call ONLY after requireAdmin(). Each query is scoped
// to a [from, to] window (ISO strings) and an optional segment filter.

import "server-only";
import { createSupabaseAdminClient } from "./supabase/admin";

export type Overview = {
  visitors: number;
  sessions: number;
  pageviews: number;
  avg_session_sec: number;
  avg_pages: number;
  bounce_rate: number;
  leads_total: number;
  conversion_rate: number;
};

export type TimePoint = { day: string; visitors: number; pageviews: number };
export type TopPage = { path: string; views: number; avg_sec: number; exits: number };
export type TopBusiness = { business_slug: string; name: string | null; views: number; avg_sec: number };
export type Source = { referrer_host: string; sessions: number };
export type Breakdown = { label: string; sessions: number };
export type Funnel = { listing_views: number; cta_clicks: number; form_submits: number; won: number };

const num = (v: unknown): number => (typeof v === "number" ? v : Number(v ?? 0)) || 0;

export type AnalyticsBundle = {
  overview: Overview;
  timeseries: TimePoint[];
  topPages: TopPage[];
  topBusinesses: TopBusiness[];
  sources: Source[];
  devices: Breakdown[];
  browsers: Breakdown[];
  countries: Breakdown[];
  funnel: Funnel;
};

const EMPTY_OVERVIEW: Overview = {
  visitors: 0,
  sessions: 0,
  pageviews: 0,
  avg_session_sec: 0,
  avg_pages: 0,
  bounce_rate: 0,
  leads_total: 0,
  conversion_rate: 0,
};

const EMPTY_FUNNEL: Funnel = { listing_views: 0, cta_clicks: 0, form_submits: 0, won: 0 };

export async function getAnalytics(fromISO: string, toISO: string): Promise<AnalyticsBundle> {
  const db = createSupabaseAdminClient();
  const p = { p_from: fromISO, p_to: toISO };

  const [overview, timeseries, topPages, topBusinesses, sources, devices, browsers, countries, funnel] =
    await Promise.all([
      db.rpc("analytics_overview", p),
      db.rpc("analytics_timeseries", p),
      db.rpc("analytics_top_pages", { ...p, p_limit: 25 }),
      db.rpc("analytics_top_businesses", { ...p, p_limit: 15 }),
      db.rpc("analytics_sources", { ...p, p_limit: 12 }),
      db.rpc("analytics_breakdown", { ...p, p_dimension: "device" }),
      db.rpc("analytics_breakdown", { ...p, p_dimension: "browser" }),
      db.rpc("analytics_breakdown", { ...p, p_dimension: "country" }),
      db.rpc("analytics_funnel", p),
    ]);

  const ov = (overview.data?.[0] ?? null) as Overview | null;
  const fn = (funnel.data?.[0] ?? null) as Funnel | null;

  return {
    overview: ov
      ? {
          visitors: num(ov.visitors),
          sessions: num(ov.sessions),
          pageviews: num(ov.pageviews),
          avg_session_sec: num(ov.avg_session_sec),
          avg_pages: num(ov.avg_pages),
          bounce_rate: num(ov.bounce_rate),
          leads_total: num(ov.leads_total),
          conversion_rate: num(ov.conversion_rate),
        }
      : EMPTY_OVERVIEW,
    timeseries: ((timeseries.data ?? []) as TimePoint[]).map((d) => ({
      day: d.day,
      visitors: num(d.visitors),
      pageviews: num(d.pageviews),
    })),
    topPages: ((topPages.data ?? []) as TopPage[]).map((d) => ({
      path: d.path,
      views: num(d.views),
      avg_sec: num(d.avg_sec),
      exits: num(d.exits),
    })),
    topBusinesses: ((topBusinesses.data ?? []) as TopBusiness[]).map((d) => ({
      business_slug: d.business_slug,
      name: d.name,
      views: num(d.views),
      avg_sec: num(d.avg_sec),
    })),
    sources: ((sources.data ?? []) as Source[]).map((d) => ({
      referrer_host: d.referrer_host,
      sessions: num(d.sessions),
    })),
    devices: ((devices.data ?? []) as Breakdown[]).map((d) => ({ label: d.label, sessions: num(d.sessions) })),
    browsers: ((browsers.data ?? []) as Breakdown[]).map((d) => ({ label: d.label, sessions: num(d.sessions) })),
    countries: ((countries.data ?? []) as Breakdown[]).map((d) => ({
      label: d.label,
      sessions: num(d.sessions),
    })),
    funnel: fn
      ? {
          listing_views: num(fn.listing_views),
          cta_clicks: num(fn.cta_clicks),
          form_submits: num(fn.form_submits),
          won: num(fn.won),
        }
      : EMPTY_FUNNEL,
  };
}

/* ====================================================================== v2 ===
 * Filterable, time-bucketed reads powering the GSC-style overview and the
 * sessions explorer (migration 0014).
 * ========================================================================== */

export type Granularity = "day" | "week" | "month";

export type AnalyticsFilters = {
  from: string;
  to: string;
  granularity: Granularity;
  device?: string | null;
  country?: string | null;
  source?: string | null;
  path?: string | null;
  business?: string | null;
};

export type OverviewV2 = {
  visitors: number;
  new_visitors: number;
  sessions: number;
  pageviews: number;
  avg_session_sec: number;
  avg_pages: number;
  bounce_rate: number;
  leads_total: number;
  conversion_rate: number;
};

export type TimePointV2 = {
  bucket: string;
  visitors: number;
  new_visitors: number;
  sessions: number;
  pageviews: number;
  leads: number;
  avg_sec: number;
};

export type PageStat = { path: string; views: number; avg_sec: number; avg_scroll: number; exits: number };
export type FilterOptions = { devices: string[]; countries: string[]; sources: string[]; businesses: { slug: string; name: string }[] };

const EMPTY_OVERVIEW_V2: OverviewV2 = {
  visitors: 0,
  new_visitors: 0,
  sessions: 0,
  pageviews: 0,
  avg_session_sec: 0,
  avg_pages: 0,
  bounce_rate: 0,
  leads_total: 0,
  conversion_rate: 0,
};

// Friendly labels for the raw CTA action values stored on leads.
const CTA_LABELS: Record<string, string> = {
  whatsapp: "WhatsApp",
  call: "Call",
  directions_maps: "Directions (Maps)",
  directions_waze: "Directions (Waze)",
};

// Shared filter args for every v2 RPC (null = ignore).
function filterArgs(f: AnalyticsFilters) {
  return {
    p_from: f.from,
    p_to: f.to,
    p_device: f.device || null,
    p_country: f.country || null,
    p_source: f.source || null,
    p_path: f.path || null,
    p_business: f.business || null,
  };
}

function toOverview(row: Record<string, unknown> | null | undefined): OverviewV2 {
  if (!row) return EMPTY_OVERVIEW_V2;
  return {
    visitors: num(row.visitors),
    new_visitors: num(row.new_visitors),
    sessions: num(row.sessions),
    pageviews: num(row.pageviews),
    avg_session_sec: num(row.avg_session_sec),
    avg_pages: num(row.avg_pages),
    bounce_rate: num(row.bounce_rate),
    leads_total: num(row.leads_total),
    conversion_rate: num(row.conversion_rate),
  };
}

export type OverviewBundle = {
  current: OverviewV2;
  previous: OverviewV2; // same-length window immediately before [from, to]
  timeseries: TimePointV2[];
  topPages: PageStat[];
  topBusinesses: TopBusiness[];
  sources: Source[];
  devices: Breakdown[];
  browsers: Breakdown[];
  countries: Breakdown[];
  returning: Breakdown[];
  cta: Breakdown[];
  funnel: Funnel;
  events: Record<string, number>; // custom-event counts by name (auth funnel, emails)
  excludedBots: number; // sessions filtered out as automated (behavioural rule)
  options: FilterOptions;
};

// WhatsApp / call / directions click counts for the period.
export type CtaRow = { cta: string; clicks: number };

export async function getOverviewBundle(f: AnalyticsFilters): Promise<OverviewBundle> {
  const db = createSupabaseAdminClient();
  const args = filterArgs(f);

  // Previous comparison window: same length, ending where this one starts.
  const span = new Date(f.to).getTime() - new Date(f.from).getTime();
  const prevTo = new Date(f.from).toISOString();
  const prevFrom = new Date(new Date(f.from).getTime() - span).toISOString();
  const prevArgs = { ...args, p_from: prevFrom, p_to: prevTo };

  // Unfiltered option lists for the filter dropdowns (full range).
  const optArgs = { p_from: f.from, p_to: f.to };

  const [cur, prev, ts, pages, biz, src, dev, brow, ctry, ret, fnl, cta, evc, bots, optDev, optCtry, optSrc, optBiz] =
    await Promise.all([
      db.rpc("analytics_overview_v2", args),
      db.rpc("analytics_overview_v2", prevArgs),
      db.rpc("analytics_timeseries_v2", { ...args, p_granularity: f.granularity }),
      db.rpc("analytics_top_pages_v2", { ...args, p_limit: 25 }),
      db.rpc("analytics_top_businesses_v2", { ...args, p_limit: 15 }),
      db.rpc("analytics_sources_v2", { ...args, p_limit: 12 }),
      db.rpc("analytics_breakdown_v2", { ...args, p_dimension: "device" }),
      db.rpc("analytics_breakdown_v2", { ...args, p_dimension: "browser" }),
      db.rpc("analytics_breakdown_v2", { ...args, p_dimension: "country" }),
      db.rpc("analytics_breakdown_v2", { ...args, p_dimension: "returning" }),
      db.rpc("analytics_funnel", { p_from: f.from, p_to: f.to }),
      db.rpc("analytics_cta_breakdown", { p_from: f.from, p_to: f.to }),
      db.rpc("analytics_event_counts", { p_from: f.from, p_to: f.to }),
      db.rpc("analytics_excluded_bots", { p_from: f.from, p_to: f.to }),
      db.rpc("analytics_breakdown_v2", { ...optArgs, p_dimension: "device" }),
      db.rpc("analytics_breakdown_v2", { ...optArgs, p_dimension: "country" }),
      db.rpc("analytics_sources_v2", { ...optArgs, p_limit: 50 }),
      db.rpc("analytics_top_businesses_v2", { ...optArgs, p_limit: 50 }),
    ]);
  const fn = (fnl.data?.[0] ?? null) as Funnel | null;

  const bd = (r: { data: unknown }): Breakdown[] =>
    ((r.data ?? []) as Breakdown[]).map((d) => ({ label: d.label, sessions: num(d.sessions) }));

  return {
    current: toOverview((cur.data?.[0] ?? null) as Record<string, unknown> | null),
    previous: toOverview((prev.data?.[0] ?? null) as Record<string, unknown> | null),
    timeseries: ((ts.data ?? []) as TimePointV2[]).map((d) => ({
      bucket: d.bucket,
      visitors: num(d.visitors),
      new_visitors: num(d.new_visitors),
      sessions: num(d.sessions),
      pageviews: num(d.pageviews),
      leads: num(d.leads),
      avg_sec: num(d.avg_sec),
    })),
    topPages: ((pages.data ?? []) as PageStat[]).map((d) => ({
      path: d.path,
      views: num(d.views),
      avg_sec: num(d.avg_sec),
      avg_scroll: num(d.avg_scroll),
      exits: num(d.exits),
    })),
    topBusinesses: ((biz.data ?? []) as TopBusiness[]).map((d) => ({
      business_slug: d.business_slug,
      name: d.name,
      views: num(d.views),
      avg_sec: num(d.avg_sec),
    })),
    sources: ((src.data ?? []) as Source[]).map((d) => ({ referrer_host: d.referrer_host, sessions: num(d.sessions) })),
    devices: bd(dev),
    browsers: bd(brow),
    countries: bd(ctry),
    returning: bd(ret),
    cta: ((cta.data ?? []) as CtaRow[]).map((c) => ({ label: CTA_LABELS[c.cta] ?? c.cta, sessions: num(c.clicks) })),
    events: Object.fromEntries(
      ((evc.data ?? []) as { name: string; count: number }[]).map((e) => [e.name, num(e.count)]),
    ),
    excludedBots: num(bots.data),
    funnel: fn
      ? {
          listing_views: num(fn.listing_views),
          cta_clicks: num(fn.cta_clicks),
          form_submits: num(fn.form_submits),
          won: num(fn.won),
        }
      : EMPTY_FUNNEL,
    options: {
      devices: bd(optDev).map((d) => d.label),
      countries: bd(optCtry).map((d) => d.label),
      sources: ((optSrc.data ?? []) as Source[]).map((d) => d.referrer_host),
      businesses: ((optBiz.data ?? []) as TopBusiness[]).map((d) => ({
        slug: d.business_slug,
        name: d.name ?? d.business_slug,
      })),
    },
  };
}

// Filter dropdown options for a window (used by the sessions explorer, which
// doesn't need the full overview bundle).
export async function getFilterOptions(fromISO: string, toISO: string): Promise<FilterOptions> {
  const db = createSupabaseAdminClient();
  const p = { p_from: fromISO, p_to: toISO };
  const [dev, ctry, src, biz] = await Promise.all([
    db.rpc("analytics_breakdown_v2", { ...p, p_dimension: "device" }),
    db.rpc("analytics_breakdown_v2", { ...p, p_dimension: "country" }),
    db.rpc("analytics_sources_v2", { ...p, p_limit: 50 }),
    db.rpc("analytics_top_businesses_v2", { ...p, p_limit: 50 }),
  ]);
  return {
    devices: ((dev.data ?? []) as Breakdown[]).map((d) => d.label),
    countries: ((ctry.data ?? []) as Breakdown[]).map((d) => d.label),
    sources: ((src.data ?? []) as Source[]).map((d) => d.referrer_host),
    businesses: ((biz.data ?? []) as TopBusiness[]).map((d) => ({ slug: d.business_slug, name: d.name ?? d.business_slug })),
  };
}

/* ----------------------------------------------------------- sessions explorer */

export type SessionRow = {
  id: string;
  created_at: string;
  visitor_id: string | null;
  is_returning: boolean;
  entry_path: string | null;
  referrer_host: string | null;
  device_type: string | null;
  country: string | null;
  city: string | null;
  page_count: number;
  duration_sec: number;
  lead_count: number;
};

export async function getSessionsList(
  f: AnalyticsFilters,
  limit: number,
  offset: number,
): Promise<{ rows: SessionRow[]; total: number }> {
  const db = createSupabaseAdminClient();
  const { data } = await db.rpc("analytics_sessions_list", {
    ...filterArgs(f),
    p_limit: limit,
    p_offset: offset,
  });
  const raw = (data ?? []) as (SessionRow & { total_rows: number })[];
  return {
    rows: raw.map((r) => ({
      id: r.id,
      created_at: r.created_at,
      visitor_id: r.visitor_id,
      is_returning: r.is_returning,
      entry_path: r.entry_path,
      referrer_host: r.referrer_host,
      device_type: r.device_type,
      country: r.country,
      city: r.city,
      page_count: num(r.page_count),
      duration_sec: num(r.duration_sec),
      lead_count: num(r.lead_count),
    })),
    total: raw.length > 0 ? num(raw[0].total_rows) : 0,
  };
}

export type SessionPageview = {
  path: string;
  title: string | null;
  business_slug: string | null;
  created_at: string;
  duration_ms: number | null;
  max_scroll_pct: number | null;
};

export type SessionLead = {
  id: string;
  created_at: string;
  lead_type: string | null;
  action: string | null;
  name: string | null;
  phone: string | null;
  service_slug: string | null;
  status: string | null;
};

export type SessionDetail = {
  session: (SessionRow & { browser: string | null; os: string | null; utm_source: string | null }) | null;
  pageviews: SessionPageview[];
  leads: SessionLead[];
};

export async function getSessionDetail(id: string): Promise<SessionDetail> {
  const db = createSupabaseAdminClient();
  const [sessionRes, pvRes, leadRes] = await Promise.all([
    db
      .from("analytics_sessions")
      .select(
        "id, created_at, last_seen_at, visitor_id, is_returning, entry_path, referrer_host, device_type, browser, os, country, city, utm_source",
      )
      .eq("id", id)
      .maybeSingle(),
    db
      .from("analytics_pageviews")
      .select("path, title, business_slug, created_at, duration_ms, max_scroll_pct")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
    db
      .from("leads")
      .select("id, created_at, lead_type, action, name, phone, service_slug, status")
      .eq("session_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const leadData = leadRes.data;
  const s = sessionRes.data as
    | (Record<string, unknown> & { last_seen_at: string; created_at: string })
    | null;

  return {
    session: s
      ? {
          id: s.id as string,
          created_at: s.created_at,
          visitor_id: (s.visitor_id as string) ?? null,
          is_returning: Boolean(s.is_returning),
          entry_path: (s.entry_path as string) ?? null,
          referrer_host: (s.referrer_host as string) ?? null,
          device_type: (s.device_type as string) ?? null,
          country: (s.country as string) ?? null,
          city: (s.city as string) ?? null,
          page_count: (pvRes.data?.length ?? 0) as number,
          duration_sec: Math.round(
            (new Date(s.last_seen_at).getTime() - new Date(s.created_at).getTime()) / 1000,
          ),
          lead_count: leadData?.length ?? 0,
          browser: (s.browser as string) ?? null,
          os: (s.os as string) ?? null,
          utm_source: (s.utm_source as string) ?? null,
        }
      : null,
    pageviews: ((pvRes.data ?? []) as SessionPageview[]).map((p) => ({
      path: p.path,
      title: p.title,
      business_slug: p.business_slug,
      created_at: p.created_at,
      duration_ms: p.duration_ms,
      max_scroll_pct: p.max_scroll_pct,
    })),
    leads: (leadData ?? []) as SessionLead[],
  };
}
