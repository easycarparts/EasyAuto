// Server-side enrichment for the analytics collector. Dependency-free: light
// regex UA parsing, edge geo headers, a daily-rotating anonymous visitor hash,
// and a bot filter. All of this runs in /api/analytics/collect — never the
// browser — so no raw IP or user-agent is ever stored, only derived buckets.

import "server-only";
import { createHash } from "node:crypto";

export type DeviceInfo = { device: "mobile" | "tablet" | "desktop"; browser: string; os: string };

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|vkshare|whatsapp|telegram|headless|lighthouse|pagespeed|gtmetrix|monitor|preview|fetch|curl|wget|python-requests|axios|node-fetch|go-http/i;

export function isBot(ua: string | null): boolean {
  if (!ua) return true; // no UA = almost always automation
  return BOT_RE.test(ua);
}

export function parseUserAgent(ua: string | null): DeviceInfo {
  const s = ua ?? "";
  const device: DeviceInfo["device"] = /iPad|Tablet|PlayBook|Silk/i.test(s)
    ? "tablet"
    : /Mobi|Android.+Mobile|iPhone|iPod|Windows Phone/i.test(s)
      ? "mobile"
      : "desktop";

  // Order matters: more specific engines before generic ones.
  const browser = /Edg\//i.test(s)
    ? "Edge"
    : /OPR\/|Opera/i.test(s)
      ? "Opera"
      : /SamsungBrowser/i.test(s)
        ? "Samsung Internet"
        : /Chrome\//i.test(s)
          ? "Chrome"
          : /Firefox\//i.test(s)
            ? "Firefox"
            : /Version\/.*Safari/i.test(s)
              ? "Safari"
              : "Other";

  const os = /Windows/i.test(s)
    ? "Windows"
    : /iPhone|iPad|iPod/i.test(s)
      ? "iOS"
      : /Android/i.test(s)
        ? "Android"
        : /Mac OS X/i.test(s)
          ? "macOS"
          : /Linux/i.test(s)
            ? "Linux"
            : "Other";

  return { device, browser, os };
}

// Client IP from the proxy chain (Vercel sets x-forwarded-for / x-real-ip).
export function clientIp(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return headers.get("x-real-ip") ?? "0.0.0.0";
}

// Coarse geo from the edge. Vercel injects these; locally they're absent.
export function geoFrom(headers: Headers): { country: string | null; city: string | null } {
  const country = headers.get("x-vercel-ip-country");
  const cityRaw = headers.get("x-vercel-ip-city");
  const city = cityRaw ? decodeURIComponent(cityRaw) : null;
  return { country: country || null, city: city || null };
}

// Anonymous unique-visitor key. Hash of (ip + ua + secret + UTC date) so the
// same visitor maps to one hash for a day, then rotates — we can count uniques
// without storing anything that identifies a person, and the value is useless
// tomorrow. No reversibility, no persistent cookie.
export function visitorHash(ip: string, ua: string | null, utcDate: string): string {
  const secret = process.env.ANALYTICS_SALT ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "easyauto";
  return createHash("sha256").update(`${utcDate}|${ip}|${ua ?? ""}|${secret}`).digest("hex").slice(0, 32);
}

// Bare host of a referrer, dropping our own domain (internal navigation = direct).
export function referrerHost(referrer: string | null, selfHost: string | null): string | null {
  if (!referrer) return null;
  try {
    const host = new URL(referrer).host.replace(/^www\./, "");
    if (selfHost && host === selfHost.replace(/^www\./, "")) return null;
    return host;
  } catch {
    return null;
  }
}

// Pull the business slug out of a listing path. Matches /business/{slug} but not
// the nested blog routes (/business/{slug}/blog/...), which aren't listing views.
export function businessSlugFromPath(path: string): string | null {
  const m = /^\/business\/([^/]+)\/?$/.exec(path);
  return m ? m[1] : null;
}
