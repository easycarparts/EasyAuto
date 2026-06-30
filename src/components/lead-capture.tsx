"use client";

// Adaptive lead-capture funnel (one component, every page).
//
// This is the "canonical" funnel: it is written ONCE and parameterised by the
// page it sits on. Each page passes its own context (service, optional location,
// optional business) and the banner copy + the form's hidden attribution fields
// fill themselves in. There are no per-page funnels to maintain — add it to a new
// page with a single line.
//
// UX: an animated inline banner in the reserved slot → click opens a focused modal
// with a 3-field form (name, phone required; message optional). Submits to the
// `submitLead` server action, which stores the lead (owner-flagged for high-intent
// services) in Supabase for the admin inbox. Honeypot ("company") blocks bots.

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { submitLead } from "@/app/actions/lead";
import { sessionId } from "@/lib/analytics/ids";

export type LeadCaptureProps = {
  // Human label, e.g. "Paint protection film (PPF)".
  service: string;
  // Slug for attribution + owner-funnel routing, e.g. "paint-protection-film".
  serviceSlug: string;
  // Optional location context (combo pages), e.g. "Dubai" / "dubai".
  locationLabel?: string;
  locationSlug?: string;
  // Optional listing context.
  businessId?: number;
  // Visual variant: full banner (landing pages) or compact card (sidebars).
  variant?: "banner" | "card";
};

export function LeadCapture({
  service,
  serviceSlug,
  locationLabel,
  locationSlug,
  businessId,
  variant = "banner",
}: LeadCaptureProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const label = service.toLowerCase();
  const where = locationLabel ? ` in ${locationLabel}` : " in the UAE";

  return (
    <>
      {variant === "banner" ? (
        <div className="overflow-hidden rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 to-surface p-5 shadow-card sm:flex sm:items-center sm:justify-between sm:gap-6">
          <div>
            <p className="text-base font-semibold text-ink">
              Want quotes for {label}{where}?
            </p>
            <p className="mt-1 text-sm text-body">
              Tell us what you need and get matched with top-rated specialists — free, no obligation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lead-sheen mt-4 inline-flex h-11 items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white shadow-pop transition-transform hover:scale-[1.02] hover:bg-brand-700 sm:mt-0 sm:shrink-0"
          >
            Get free quotes
          </button>
        </div>
      ) : (
        <div className="rounded-2xl border border-brand-200 bg-brand-50 p-5 shadow-card">
          <p className="text-base font-bold text-ink">Get {label} quotes</p>
          <p className="mt-1 text-sm text-body">
            Send one enquiry and hear back from trusted specialists{where}.
          </p>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="lead-sheen mt-4 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-5 font-semibold text-white transition-transform hover:scale-[1.02] hover:bg-brand-700"
          >
            Get free quotes
          </button>
        </div>
      )}

      {open && (
        <LeadModal
          service={service}
          serviceSlug={serviceSlug}
          locationLabel={locationLabel}
          locationSlug={locationSlug}
          businessId={businessId}
          source={pathname}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function LeadModal({
  service,
  serviceSlug,
  locationLabel,
  locationSlug,
  businessId,
  source,
  onClose,
}: {
  service: string;
  serviceSlug: string;
  locationLabel?: string;
  locationSlug?: string;
  businessId?: number;
  source: string;
  onClose: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  async function onSubmit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    // Stamp the analytics session id at submit time so this lead links back to
    // the visitor's journey (reading sessionStorage here avoids an effect).
    formData.set("sessionId", sessionId());
    const res = await submitLead(formData);
    setSubmitting(false);
    if (res.ok) setDone(true);
    else setError(res.error ?? "Something went wrong.");
  }

  const chip = `${service}${locationLabel ? ` · ${locationLabel}` : ""}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ink/50 p-0 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Get ${service.toLowerCase()} quotes`}
        className="w-full max-w-md rounded-t-2xl bg-surface p-6 shadow-pop sm:rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-ink">
            {done ? "Thanks — request sent" : "Get free quotes"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1 text-faint hover:bg-canvas hover:text-ink"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {done ? (
          <div className="mt-3">
            <p className="text-body">
              We&apos;ve recorded your request for <span className="font-semibold text-ink">{chip}</span>.
              A specialist will be in touch shortly.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white hover:bg-brand-700"
            >
              Done
            </button>
          </div>
        ) : (
          <form action={onSubmit} className="mt-4 space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
              Enquiry: {chip}
            </div>

            {/* Hidden attribution — auto-filled from the page context. */}
            <input type="hidden" name="serviceSlug" value={serviceSlug} />
            <input type="hidden" name="serviceLabel" value={service} />
            {locationSlug && <input type="hidden" name="locationSlug" value={locationSlug} />}
            {locationLabel && <input type="hidden" name="locationLabel" value={locationLabel} />}
            {businessId != null && <input type="hidden" name="businessId" value={String(businessId)} />}
            <input type="hidden" name="source" value={source} />
            {/* Honeypot — hidden from real users; bots fill it and get dropped. */}
            <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label>
                Company
                <input type="text" name="company" tabIndex={-1} autoComplete="off" />
              </label>
            </div>

            <Field label="Your name" name="name" type="text" required autoComplete="name" />
            <Field label="Phone" name="phone" type="tel" required autoComplete="tel" placeholder="05X XXX XXXX" />
            <Field label="Email (optional)" name="email" type="email" autoComplete="email" />
            <div>
              <label htmlFor="lead-message" className="block text-sm font-medium text-body">
                What do you need? (optional)
              </label>
              <textarea
                id="lead-message"
                name="message"
                rows={3}
                className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-body shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
                placeholder={`e.g. full-body ${service.toLowerCase()} for a 2023 SUV`}
              />
            </div>

            {error && <p className="text-sm font-medium text-danger-600">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-60"
            >
              {submitting ? "Sending…" : "Send request"}
            </button>
            <p className="text-center text-xs text-faint">
              By sending, you agree to be contacted about your enquiry. We never sell your details.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  name,
  type,
  required,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  required?: boolean;
  placeholder?: string;
  autoComplete?: string;
}) {
  return (
    <div>
      <label htmlFor={`lead-${name}`} className="block text-sm font-medium text-body">
        {label} {required && <span className="text-danger-600">*</span>}
      </label>
      <input
        id={`lead-${name}`}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className="mt-1 w-full rounded-xl border border-line bg-surface px-3 py-2 text-body shadow-sm outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
      />
    </div>
  );
}
