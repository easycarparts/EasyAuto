"use client";

import { usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { whatsappNumber } from "@/lib/format";
import { OWNER_FUNNEL, routeFor } from "@/lib/lead-routing";

// Only the fields the client needs — avoids shipping the heavy description /
// competitors / raw hours text into the browser payload.
export type LeadTarget = {
  id: number;
  name: string;
  phone: string | null;
  categorySlug: string | null;
  city: string | null;
};

// Primary lead-capture CTAs on a listing. WhatsApp (green) leads, then Call and
// Directions. Each click fire-and-forget logs a row into `leads` (anon insert is
// allowed by RLS) so we capture intent from day one.
export function LeadButtons({
  business,
  mapsLink,
}: {
  business: LeadTarget;
  mapsLink: string | null;
}) {
  const pathname = usePathname();
  const route = routeFor(business.categorySlug);
  const waNumber =
    route === "own_service" ? OWNER_FUNNEL.whatsapp : whatsappNumber(business.phone);

  const text = encodeURIComponent(
    `Hi ${business.name}, I came from your Easy Auto listing and I'd like to enquire about your services.`,
  );
  const waHref = waNumber ? `https://wa.me/${waNumber}?text=${text}` : null;

  function logLead(action: string) {
    // Don't block the navigation on the insert; ignore failures silently.
    void supabase
      .from("leads")
      .insert({
        business_id: business.id,
        category_slug: business.categorySlug,
        city: business.city,
        action,
        routed_to: route,
        source: pathname,
      })
      .then(
        () => {},
        () => {},
      );
  }

  return (
    <div className="space-y-2">
      {waHref && (
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logLead("whatsapp")}
          className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-success-500 font-semibold text-white transition-colors hover:bg-success-600"
        >
          <WhatsAppIcon />
          WhatsApp
        </a>
      )}
      {business.phone && (
        <a
          href={`tel:${business.phone}`}
          onClick={() => logLead("call")}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-line bg-surface font-semibold text-body transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Call
        </a>
      )}
      {mapsLink && (
        <a
          href={mapsLink}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => logLead("directions")}
          className="flex h-11 w-full items-center justify-center rounded-xl border border-line bg-surface font-semibold text-body transition-colors hover:border-brand-300 hover:text-brand-700"
        >
          Get directions
        </a>
      )}
    </div>
  );
}

function WhatsAppIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.27-1.38a9.9 9.9 0 0 0 4.77 1.22c5.46 0 9.9-4.44 9.9-9.9S17.5 2 12.04 2zm0 18.02c-1.5 0-2.97-.4-4.25-1.16l-.3-.18-3.13.82.83-3.05-.2-.31a8.18 8.18 0 0 1-1.26-4.37c0-4.54 3.7-8.23 8.24-8.23 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.82c0 4.54-3.69 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.16.25-.64.8-.78.97-.14.16-.29.18-.54.06-.25-.12-1.05-.39-2-1.23-.74-.66-1.24-1.48-1.38-1.73-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.16.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.16 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.16 1.75 2.67 4.25 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.68-1.18.21-.58.21-1.07.14-1.18-.06-.1-.22-.16-.47-.28z" />
    </svg>
  );
}
