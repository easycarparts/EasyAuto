// Shared browser-side identifiers for analytics. Used by the tracker (to stamp
// page views) and by the lead components (to link conversions back to a session).
//
//  - session id  → sessionStorage, one per tab/visit, dies when the tab closes.
//  - visitor id  → localStorage, a random first-party token that persists across
//    visits so we can count true unique visitors and tell new from returning.
//
// Both are opaque random values — no personal data. localStorage/sessionStorage
// can throw in private mode or when blocked; every accessor degrades gracefully.

function uuid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function sessionId(): string {
  try {
    let id = sessionStorage.getItem("ea_sid");
    if (!id || !UUID_RE.test(id)) {
      id = uuid();
      sessionStorage.setItem("ea_sid", id);
    }
    return id;
  } catch {
    return uuid();
  }
}

export function visitorId(): string {
  try {
    let id = localStorage.getItem("ea_vid");
    if (!id || !UUID_RE.test(id)) {
      id = uuid();
      localStorage.setItem("ea_vid", id);
    }
    return id;
  } catch {
    // No durable storage → fall back to the per-tab id so the visit still counts.
    return sessionId();
  }
}

export { uuid };
