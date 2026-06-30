"use client";

// Cookieless first-party page tracker. Mounted once in the root layout, it:
//   - generates a per-tab session id (sessionStorage) and a per-view id
//   - POSTs a 'view' event on every App Router navigation
//   - measures active time-on-page (pauses when the tab is hidden) and max
//     scroll depth, flushing an 'exit' event via sendBeacon on page hide / nav
//
// No cookie, no localStorage, no PII — server-side enrichment turns the request
// into anonymous buckets. Failures are swallowed; tracking never affects UX.

import { useEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { sessionId, visitorId, uuid } from "@/lib/analytics/ids";

const ENDPOINT = "/api/analytics/collect";

function send(body: Record<string, unknown>, beacon = false) {
  try {
    const payload = JSON.stringify(body);
    if (beacon && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(ENDPOINT, new Blob([payload], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, { method: "POST", body: payload, keepalive: true }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Per-view mutable state, kept in refs so the exit flush sees current values.
  const pvId = useRef<string>("");
  const activeMs = useRef(0); // accumulated visible time
  const lastTick = useRef(0); // timestamp of last resume
  const maxScroll = useRef(0);
  const flushed = useRef(true);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Flush the previous view (client-side nav) before starting a new one.
    flush();

    const sid = sessionId();
    pvId.current = uuid();
    activeMs.current = 0;
    lastTick.current = Date.now();
    maxScroll.current = scrollPct();
    flushed.current = false;

    const utm = {
      source: searchParams.get("utm_source") ?? undefined,
      medium: searchParams.get("utm_medium") ?? undefined,
      campaign: searchParams.get("utm_campaign") ?? undefined,
    };
    const hasUtm = utm.source || utm.medium || utm.campaign;

    send({
      t: "view",
      sid,
      vid: visitorId(),
      pvid: pvId.current,
      path: pathname,
      ref: document.referrer || null,
      title: document.title,
      utm: hasUtm ? utm : null,
    });

    function scrollPct(): number {
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      if (scrollable <= 0) return 100;
      return Math.min(100, Math.round((doc.scrollTop / scrollable) * 100));
    }

    function onScroll() {
      const p = scrollPct();
      if (p > maxScroll.current) maxScroll.current = p;
    }

    // Only count time while the tab is actually visible.
    function pause() {
      if (lastTick.current) {
        activeMs.current += Date.now() - lastTick.current;
        lastTick.current = 0;
      }
    }
    function resume() {
      if (!lastTick.current) lastTick.current = Date.now();
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") {
        pause();
        flush(); // hidden tabs may never fire pagehide on mobile
      } else {
        resume();
      }
    }

    function flush() {
      if (flushed.current || !pvId.current) return;
      pause();
      flushed.current = true;
      send(
        {
          t: "exit",
          sid: sessionId(),
          pvid: pvId.current,
          dur: activeMs.current,
          scroll: maxScroll.current,
        },
        true,
      );
    }

    // Send the current engaged time without ending the view. An early ping (4s)
    // means a genuine reader's duration is recorded quickly and reliably — so the
    // server-side "≥3s = human" rule doesn't wrongly drop real short visits when a
    // final exit beacon is unreliable. Then a steady heartbeat for longer reads.
    function ping() {
      if (document.visibilityState === "visible") {
        send(
          { t: "exit", sid, pvid: pvId.current, dur: activeMs.current + (Date.now() - lastTick.current), scroll: maxScroll.current },
          false,
        );
      }
    }
    const early = window.setTimeout(ping, 4_000);
    const heartbeat = window.setInterval(ping, 12_000);

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    window.addEventListener("blur", flush);

    return () => {
      window.clearTimeout(early);
      window.clearInterval(heartbeat);
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("blur", flush);
      flush();
    };
  }, [pathname, searchParams]);

  return null;
}
