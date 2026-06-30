// Analytics collector. The browser tracker POSTs two event kinds here:
//   { t: 'view' }  on each page view  -> create/refresh session + insert pageview
//   { t: 'exit' }  on page hide       -> finalise that pageview (duration, scroll)
//
// All enrichment (UA parse, geo, anonymous visitor hash, bot filter) happens
// server-side; writes use the service_role client. Admin traffic is excluded so
// the owner's own browsing doesn't inflate the numbers. Fire-and-forget by
// design — we always return 204 fast and never block the user's navigation.

import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  isBot,
  parseUserAgent,
  clientIp,
  geoFrom,
  visitorHash,
  referrerHost,
  businessSlugFromPath,
  type DeviceInfo,
} from "@/lib/analytics/enrich";

export const dynamic = "force-dynamic";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NO_CONTENT = new NextResponse(null, { status: 204 });

type Payload = {
  t?: "view" | "exit";
  sid?: string;
  vid?: string;
  pvid?: string;
  path?: string;
  ref?: string | null;
  title?: string | null;
  utm?: { source?: string; medium?: string; campaign?: string } | null;
  dur?: number;
  scroll?: number;
};

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return NO_CONTENT;
  }

  const { t, sid, pvid } = body;
  if ((t !== "view" && t !== "exit") || !sid || !pvid || !UUID_RE.test(sid) || !UUID_RE.test(pvid)) {
    return NO_CONTENT;
  }

  const hdrs = await headers();
  const ua = hdrs.get("user-agent");
  if (isBot(ua)) return NO_CONTENT;

  const db = createSupabaseAdminClient();
  const now = new Date().toISOString();

  // --- Exit: just finalise the existing pageview + bump the session. ----------
  if (t === "exit") {
    const duration = Number.isFinite(body.dur) ? Math.max(0, Math.min(1_800_000, Math.round(body.dur!))) : null;
    const scroll =
      Number.isFinite(body.scroll) ? Math.max(0, Math.min(100, Math.round(body.scroll!))) : null;
    await Promise.allSettled([
      db.from("analytics_pageviews").update({ duration_ms: duration, max_scroll_pct: scroll }).eq("id", pvid),
      db.from("analytics_sessions").update({ last_seen_at: now }).eq("id", sid),
    ]);
    return NO_CONTENT;
  }

  // --- View: drop admin traffic, then upsert session + insert pageview. -------
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 512) : "/";

  // Only pay for the auth lookup when a Supabase auth cookie is actually present
  // — anonymous visitors (the overwhelming majority) skip it entirely.
  const jar = await cookies();
  const maybeLoggedIn = jar.getAll().some((c) => c.name.includes("-auth-token"));
  if (maybeLoggedIn && (await isAdmin())) return NO_CONTENT;

  const ip = clientIp(hdrs);
  const utcDate = now.slice(0, 10); // YYYY-MM-DD (UTC)
  const dev: DeviceInfo = parseUserAgent(ua);
  const { country, city } = geoFrom(hdrs);
  const selfHost = hdrs.get("host");
  const hash = visitorHash(ip, ua, utcDate);
  // Persistent first-party id (truthful unique-visitor key); fall back to the
  // daily hash when the browser blocked localStorage.
  const visitor = typeof body.vid === "string" && UUID_RE.test(body.vid) ? body.vid : hash;

  // Returning = we've seen this visitor in an earlier session. One indexed lookup,
  // evaluated before the insert so the very first session is correctly "new".
  const prior = await db
    .from("analytics_sessions")
    .select("id")
    .eq("visitor_id", visitor)
    .neq("id", sid)
    .limit(1);
  const isReturning = (prior.data?.length ?? 0) > 0;

  // Insert the session on its first view only; later views just bump last_seen.
  await db.from("analytics_sessions").upsert(
    {
      id: sid,
      visitor_hash: hash,
      visitor_id: visitor,
      is_returning: isReturning,
      created_at: now,
      last_seen_at: now,
      entry_path: path,
      referrer_host: referrerHost(body.ref ?? null, selfHost),
      utm_source: body.utm?.source ?? null,
      utm_medium: body.utm?.medium ?? null,
      utm_campaign: body.utm?.campaign ?? null,
      device_type: dev.device,
      browser: dev.browser,
      os: dev.os,
      country,
      city,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  await Promise.allSettled([
    db.from("analytics_sessions").update({ last_seen_at: now }).eq("id", sid),
    db.from("analytics_pageviews").insert({
      id: pvid,
      session_id: sid,
      created_at: now,
      path,
      business_slug: businessSlugFromPath(path),
      title: typeof body.title === "string" ? body.title.slice(0, 300) : null,
    }),
  ]);

  return NO_CONTENT;
}

async function isAdmin(): Promise<boolean> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;
    const { data } = await supabase.from("profiles").select("is_admin").eq("id", user.id).maybeSingle();
    return Boolean(data?.is_admin);
  } catch {
    return false;
  }
}
