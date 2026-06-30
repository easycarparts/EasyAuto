"use client";

// Client-side custom event tracking. Fires a named event into the analytics
// collector, tied to the visitor's session + persistent id. Fire-and-forget —
// never blocks or throws into the UI.
//
// Used for the auth funnel (signup/login/OTP) and the app-side record of emails
// Resend sent. Distinct from page views: those happen automatically in the
// tracker; these are explicit moments in a flow.

import { sessionId, visitorId, uuid } from "./ids";

const ENDPOINT = "/api/analytics/collect";

export function trackEvent(
  name: string,
  props?: Record<string, unknown>,
  category = "auth",
): void {
  try {
    const body = JSON.stringify({
      t: "event",
      sid: sessionId(),
      vid: visitorId(),
      pvid: uuid(), // event id
      name,
      category,
      props: props ?? null,
      path: typeof window !== "undefined" ? window.location.pathname : null,
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch(ENDPOINT, { method: "POST", body, keepalive: true }).catch(() => {});
  } catch {
    /* tracking must never affect the flow */
  }
}
